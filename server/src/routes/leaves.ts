import { Router } from "express";
import { eq, and, ne, between } from "drizzle-orm";
import { db } from "../db.js";
import { leaveRequests, users } from "../db/schema.js";

export const leavesRouter = Router();

const SHIFTS = ["morning", "afternoon", "night"] as const;
const STATUSES = ["pending", "approved", "rejected"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const getJoinedLeaveRequest = async (id: number) => {
  return db.select({
    id: leaveRequests.id,
    userId: leaveRequests.userId,
    userName: users.name,
    date: leaveRequests.date,
    shift: leaveRequests.shift,
    status: leaveRequests.status,
    reason: leaveRequests.reason,
    remark: leaveRequests.remark,
    createdAt: leaveRequests.createdAt,
    updatedAt: leaveRequests.updatedAt,
  })
  .from(leaveRequests)
  .innerJoin(users, eq(users.id, leaveRequests.userId))
  .where(eq(leaveRequests.id, id))
  .then((rows) => rows[0]);
};

leavesRouter.get("/", async (req, res) => {
  const { start, end } = req.query;
  if (typeof start !== "string" || typeof end !== "string" || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return res.status(400).json({ error: "start and end query params (YYYY-MM-DD) are required" });
  }
  try {
    const rows = await db.select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      userName: users.name,
      date: leaveRequests.date,
      shift: leaveRequests.shift,
      status: leaveRequests.status,
      reason: leaveRequests.reason,
      remark: leaveRequests.remark,
      createdAt: leaveRequests.createdAt,
      updatedAt: leaveRequests.updatedAt,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(between(leaveRequests.date, start, end))
    .orderBy(leaveRequests.date, leaveRequests.shift);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

leavesRouter.get("/:id", async (req, res) => {
  try {
    const row = await getJoinedLeaveRequest(Number(req.params.id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

leavesRouter.post("/", async (req, res) => {
  const { userId, date, shift, reason } = req.body ?? {};
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "userId is required" });
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }
  if (!SHIFTS.includes(shift)) return res.status(400).json({ error: `shift must be one of ${SHIFTS.join(", ")}` });

  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).then((rows) => rows[0]);
    if (!user) return res.status(400).json({ error: "Unknown userId" });

    const duplicate = await db.select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.date, date),
        eq(leaveRequests.shift, shift),
        ne(leaveRequests.status, "rejected")
      ))
      .then((rows) => rows[0]);

    if (duplicate) {
      const dupDetails = await getJoinedLeaveRequest(duplicate.id);
      return res.status(409).json({
        error: "You already have a request for this shift on this date",
        conflict: dupDetails,
      });
    }

    const conflict = await db.select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.date, date),
        eq(leaveRequests.shift, shift),
        eq(leaveRequests.status, "approved")
      ))
      .then((rows) => rows[0]);

    if (conflict) {
      const confDetails = await getJoinedLeaveRequest(conflict.id);
      return res.status(409).json({
        error: "Another request for this date and shift is already approved",
        conflict: confDetails,
      });
    }

    const [inserted] = await db.insert(leaveRequests)
      .values({
        userId,
        date,
        shift,
        reason: typeof reason === "string" ? reason : null,
      })
      .returning();

    const row = await getJoinedLeaveRequest(inserted.id);
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

leavesRouter.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status, remark } = req.body ?? {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });

  try {
    const existing = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).then((rows) => rows[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (status === "approved") {
      const conflict = await db.select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.date, existing.date),
          eq(leaveRequests.shift, existing.shift),
          eq(leaveRequests.status, "approved"),
          ne(leaveRequests.id, id)
        ))
        .then((rows) => rows[0]);

      if (conflict) {
        const confDetails = await getJoinedLeaveRequest(conflict.id);
        return res.status(409).json({
          error: "Another request for this date and shift is already approved",
          conflict: confDetails,
        });
      }
    }

    await db.update(leaveRequests)
      .set({
        status: status,
        remark: typeof remark === "string" && remark.trim() ? remark : null,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id));

    if (status === "approved") {
      await db.update(leaveRequests)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(and(
          eq(leaveRequests.date, existing.date),
          eq(leaveRequests.shift, existing.shift),
          eq(leaveRequests.status, "pending"),
          ne(leaveRequests.id, id)
        ));
    }

    const row = await getJoinedLeaveRequest(id);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

leavesRouter.patch("/:id/date", async (req, res) => {
  const id = Number(req.params.id);
  const { date, shift } = req.body ?? {};
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }

  try {
    const existing = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).then((rows) => rows[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const targetShift = (typeof shift === "string" && SHIFTS.includes(shift as any)) ? shift : existing.shift;

    const duplicate = await db.select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.userId, existing.userId),
        eq(leaveRequests.date, date),
        eq(leaveRequests.shift, targetShift),
        ne(leaveRequests.status, "rejected"),
        ne(leaveRequests.id, id)
      ))
      .then((rows) => rows[0]);

    if (duplicate) {
      const dupDetails = await getJoinedLeaveRequest(duplicate.id);
      return res.status(409).json({
        error: "You already have a request for this shift on this date",
        conflict: dupDetails,
      });
    }

    const conflict = await db.select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.date, date),
        eq(leaveRequests.shift, targetShift),
        eq(leaveRequests.status, "approved"),
        ne(leaveRequests.id, id)
      ))
      .then((rows) => rows[0]);

    if (conflict) {
      const confDetails = await getJoinedLeaveRequest(conflict.id);
      return res.status(409).json({
        error: "Another request for this date and shift is already approved",
        conflict: confDetails,
      });
    }

    await db.update(leaveRequests)
      .set({
        date: date,
        shift: targetShift,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id));

    const row = await getJoinedLeaveRequest(id);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

leavesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).then((rows) => rows[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be withdrawn" });
    }
    await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
