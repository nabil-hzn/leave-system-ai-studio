import { Router } from "express";
import { db } from "../db.js";

export const leavesRouter = Router();

const SHIFTS = ["morning", "afternoon", "night"] as const;
const STATUSES = ["pending", "approved", "rejected"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SELECT_JOINED = `
  SELECT lr.id, lr.user_id as userId, u.name as userName, lr.date, lr.shift,
         lr.status, lr.reason, lr.remark, lr.created_at as createdAt, lr.updated_at as updatedAt
  FROM leave_requests lr
  JOIN users u ON u.id = lr.user_id
`;

leavesRouter.get("/", (req, res) => {
  const { start, end } = req.query;
  if (typeof start !== "string" || typeof end !== "string" || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return res.status(400).json({ error: "start and end query params (YYYY-MM-DD) are required" });
  }
  const rows = db
    .prepare(`${SELECT_JOINED} WHERE lr.date BETWEEN ? AND ? ORDER BY lr.date, lr.shift`)
    .all(start, end);
  res.json(rows);
});

leavesRouter.get("/:id", (req, res) => {
  const row = db.prepare(`${SELECT_JOINED} WHERE lr.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

leavesRouter.post("/", (req, res) => {
  const { userId, date, shift, reason } = req.body ?? {};
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "userId is required" });
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }
  if (!SHIFTS.includes(shift)) return res.status(400).json({ error: `shift must be one of ${SHIFTS.join(", ")}` });

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(400).json({ error: "Unknown userId" });

  const duplicate = db
    .prepare(`${SELECT_JOINED} WHERE lr.user_id = ? AND lr.date = ? AND lr.shift = ? AND lr.status != 'rejected'`)
    .get(userId, date, shift);
  if (duplicate) {
    return res.status(409).json({
      error: "You already have a request for this shift on this date",
      conflict: duplicate,
    });
  }

  const conflict = db
    .prepare(`${SELECT_JOINED} WHERE lr.date = ? AND lr.shift = ? AND lr.status = 'approved'`)
    .get(date, shift);
  if (conflict) {
    return res.status(409).json({
      error: "Another request for this date and shift is already approved",
      conflict,
    });
  }

  const info = db
    .prepare("INSERT INTO leave_requests (user_id, date, shift, reason) VALUES (?, ?, ?, ?)")
    .run(userId, date, shift, typeof reason === "string" ? reason : null);

  const row = db.prepare(`${SELECT_JOINED} WHERE lr.id = ?`).get(info.lastInsertRowid);
  res.status(201).json(row);
});

leavesRouter.patch("/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status, remark } = req.body ?? {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });

  const existing = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(id) as
    | { id: number; date: string; shift: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (status === "approved") {
    const conflict = db
      .prepare(
        `${SELECT_JOINED} WHERE lr.date = ? AND lr.shift = ? AND lr.status = 'approved' AND lr.id != ?`
      )
      .get(existing.date, existing.shift, id);
    if (conflict) {
      return res.status(409).json({
        error: "Another request for this date and shift is already approved",
        conflict,
      });
    }
  }

  db.prepare("UPDATE leave_requests SET status = ?, remark = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    typeof remark === "string" && remark.trim() ? remark : null,
    id
  );

  if (status === "approved") {
    db.prepare(
      `UPDATE leave_requests SET status = 'rejected', updated_at = datetime('now')
       WHERE date = ? AND shift = ? AND status = 'pending' AND id != ?`
    ).run(existing.date, existing.shift, id);
  }

  const row = db.prepare(`${SELECT_JOINED} WHERE lr.id = ?`).get(id);
  res.json(row);
});

leavesRouter.patch("/:id/date", (req, res) => {
  const id = Number(req.params.id);
  const { date, shift } = req.body ?? {};
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }

  const existing = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(id) as
    | { id: number; user_id: number; shift: string; status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.status === "approved") {
    return res.status(400).json({ error: "Approved requests cannot be rescheduled" });
  }

  const targetShift = (typeof shift === "string" && SHIFTS.includes(shift as any)) ? shift : existing.shift;

  const duplicate = db
    .prepare(
      `${SELECT_JOINED} WHERE lr.user_id = ? AND lr.date = ? AND lr.shift = ? AND lr.status != 'rejected' AND lr.id != ?`
    )
    .get(existing.user_id, date, targetShift, id);
  if (duplicate) {
    return res.status(409).json({
      error: "You already have a request for this shift on this date",
      conflict: duplicate,
    });
  }

  // Also check if there's an approved request for this shift on this date by someone else
  const conflict = db
    .prepare(`${SELECT_JOINED} WHERE lr.date = ? AND lr.shift = ? AND lr.status = 'approved' AND lr.id != ?`)
    .get(date, targetShift, id);
  if (conflict) {
    return res.status(409).json({
      error: "Another request for this date and shift is already approved",
      conflict,
    });
  }

  db.prepare("UPDATE leave_requests SET date = ?, shift = ?, updated_at = datetime('now') WHERE id = ?").run(date, targetShift, id);

  const row = db.prepare(`${SELECT_JOINED} WHERE lr.id = ?`).get(id);
  res.json(row);
});

leavesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT status FROM leave_requests WHERE id = ?").get(id) as
    | { status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.status !== "pending") {
    return res.status(400).json({ error: "Only pending requests can be withdrawn" });
  }
  db.prepare("DELETE FROM leave_requests WHERE id = ?").run(id);
  res.status(204).end();
});
