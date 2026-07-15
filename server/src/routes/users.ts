import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { users, accessControl } from "../db/schema.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res) => {
  try {
    const list = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      email: users.email,
    }).from(users).orderBy(users.name);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.post("/sync", async (req, res) => {
  const { email, name, uid } = req.body ?? {};
  if (!uid) {
    return res.status(400).json({ error: "Firebase UID (uid) is required" });
  }

  if (!email) {
    return res.status(400).json({ error: "Email is required to verify access" });
  }

  try {
    const lowerEmail = email.trim().toLowerCase();
    const access = await db.select()
      .from(accessControl)
      .where(sql`LOWER(${accessControl.email}) = ${lowerEmail}`)
      .then((rows) => rows[0]);

    if (!access) {
      return res.status(403).json({ error: "You don't have access, please contact to the admin" });
    }

    const assignedRole = access.role;

    // 1. Check by firebase_uid
    let existingUser = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      email: users.email,
      firebaseUid: users.firebaseUid,
    })
    .from(users)
    .where(eq(users.firebaseUid, uid))
    .then((rows) => rows[0]);

    if (existingUser) {
      // Update role if it changed in access control
      if (existingUser.role !== assignedRole || existingUser.email !== email) {
        await db.update(users)
          .set({ role: assignedRole, email: email })
          .where(eq(users.id, existingUser.id));
        existingUser.role = assignedRole;
        existingUser.email = email;
      }
    } else if (email) {
      // 2. Check by email as a fallback
      existingUser = await db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        email: users.email,
        firebaseUid: users.firebaseUid,
      })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${email.toLowerCase()}`)
      .then((rows) => rows[0]);

      if (existingUser) {
        // Link account and sync role
        await db.update(users)
          .set({
            firebaseUid: uid,
            name: name || existingUser.name,
            role: assignedRole,
          })
          .where(eq(users.id, existingUser.id));
        existingUser.firebaseUid = uid;
        existingUser.role = assignedRole;
        if (name) existingUser.name = name;
      }
    }

    if (!existingUser) {
      // 3. Create new user
      const finalName = name || (email ? email.split("@")[0] : "New User");
      const [inserted] = await db.insert(users)
        .values({
          name: finalName,
          email: email || null,
          firebaseUid: uid,
          role: assignedRole,
        })
        .returning();
      existingUser = {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        firebaseUid: inserted.firebaseUid,
        role: inserted.role,
      };
    }

    res.json(existingUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Access Control CRUD
usersRouter.get("/access-control", async (_req, res) => {
  try {
    const list = await db.select({
      id: accessControl.id,
      email: accessControl.email,
      role: accessControl.role,
    }).from(accessControl).orderBy(accessControl.email);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.post("/access-control", async (req, res) => {
  const { email, role } = req.body ?? {};
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required" });
  }
  if (!["admin", "approver", "requestor"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin', 'approver', or 'requestor'" });
  }

  try {
    const lowerEmail = email.trim().toLowerCase();
    const [inserted] = await db.insert(accessControl)
      .values({
        email: lowerEmail,
        role: role,
      })
      .returning();

    // Propagate role to existing user table
    await db.update(users)
      .set({ role: role })
      .where(sql`LOWER(${users.email}) = ${lowerEmail}`);

    res.json({ id: inserted.id, email: lowerEmail, role });
  } catch (err: any) {
    if (err.message?.includes("unique") || err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "This email is already in the access control list." });
    }
    res.status(500).json({ error: err.message });
  }
});

usersRouter.put("/access-control/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { email, role } = req.body ?? {};
  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }
  if (!["admin", "approver", "requestor"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin', 'approver', or 'requestor'" });
  }

  try {
    const current = await db.select()
      .from(accessControl)
      .where(eq(accessControl.id, id))
      .then((rows) => rows[0]);

    if (!current) {
      return res.status(404).json({ error: "Access control entry not found" });
    }

    const finalEmail = email ? email.trim().toLowerCase() : current.email;

    await db.update(accessControl)
      .set({ email: finalEmail, role: role })
      .where(eq(accessControl.id, id));

    // Propagate to users table
    await db.update(users)
      .set({ role: role, email: finalEmail })
      .where(sql`LOWER(${users.email}) = ${current.email.toLowerCase()}`);

    res.json({ id, email: finalEmail, role });
  } catch (err: any) {
    if (err.message?.includes("unique") || err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "This email is already in the access control list." });
    }
    res.status(500).json({ error: err.message });
  }
});

usersRouter.delete("/access-control/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const current = await db.select()
      .from(accessControl)
      .where(eq(accessControl.id, id))
      .then((rows) => rows[0]);

    if (!current) {
      return res.status(404).json({ error: "Access control entry not found" });
    }

    await db.delete(accessControl).where(eq(accessControl.id, id));

    // Revert role in users table to requestor
    await db.update(users)
      .set({ role: "requestor" })
      .where(sql`LOWER(${users.email}) = ${current.email.toLowerCase()}`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database Viewer API (Admin Only)
usersRouter.get("/database-view", async (req, res) => {
  const { table } = req.query;
  if (!table || typeof table !== "string") {
    return res.status(400).json({ error: "Table name is required" });
  }

  const allowedTables = ["users", "leave_requests", "access_control"];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  try {
    const rows = await db.execute(sql.raw(`SELECT * FROM "${table}" ORDER BY id DESC`));
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
