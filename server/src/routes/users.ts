import { Router } from "express";
import { db } from "../db.js";

export const usersRouter = Router();

usersRouter.get("/", (_req, res) => {
  const users = db.prepare("SELECT id, name, role, email FROM users ORDER BY name").all();
  res.json(users);
});

usersRouter.post("/sync", (req, res) => {
  const { email, name, uid } = req.body ?? {};
  if (!uid) {
    return res.status(400).json({ error: "Firebase UID (uid) is required" });
  }

  if (!email) {
    return res.status(400).json({ error: "Email is required to verify access" });
  }

  const lowerEmail = email.trim().toLowerCase();
  const access = db.prepare("SELECT role FROM access_control WHERE LOWER(email) = ?").get(lowerEmail) as { role: string } | undefined;

  if (!access) {
    return res.status(403).json({ error: "You don't have access, please contact to the admin" });
  }

  const assignedRole = access.role;

  // 1. Check by firebase_uid
  let user = db.prepare("SELECT id, name, role, email, firebase_uid as firebaseUid FROM users WHERE firebase_uid = ?").get(uid) as any;

  if (user) {
    // Update role if it changed in access control
    if (user.role !== assignedRole || user.email !== email) {
      db.prepare("UPDATE users SET role = ?, email = ? WHERE id = ?").run(assignedRole, email || null, user.id);
      user.role = assignedRole;
      user.email = email || null;
    }
  } else if (email) {
    // 2. Check by email as a fallback
    user = db.prepare("SELECT id, name, role, email, firebase_uid as firebaseUid FROM users WHERE LOWER(email) = ?").get(email.toLowerCase());
    if (user) {
      // Link the account and sync role
      db.prepare("UPDATE users SET firebase_uid = ?, name = COALESCE(?, name), role = ? WHERE id = ?").run(uid, name || null, assignedRole, user.id);
      user.firebaseUid = uid;
      user.role = assignedRole;
      if (name) user.name = name;
    }
  }

  if (!user) {
    // 3. Create new user
    const finalName = name || (email ? email.split("@")[0] : "New User");
    const info = db.prepare("INSERT INTO users (name, email, firebase_uid, role) VALUES (?, ?, ?, ?)").run(finalName, email || null, uid, assignedRole);
    user = {
      id: Number(info.lastInsertRowid),
      name: finalName,
      email: email || null,
      firebaseUid: uid,
      role: assignedRole
    };
  }

  res.json(user);
});

// Access Control CRUD
usersRouter.get("/access-control", (_req, res) => {
  try {
    const list = db.prepare("SELECT id, email, role FROM access_control ORDER BY email").all();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.post("/access-control", (req, res) => {
  const { email, role } = req.body ?? {};
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required" });
  }
  if (!["admin", "approver", "requestor"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin', 'approver', or 'requestor'" });
  }

  try {
    const lowerEmail = email.trim().toLowerCase();
    const info = db.prepare("INSERT INTO access_control (email, role) VALUES (?, ?)").run(lowerEmail, role);
    
    // Propagate role to existing user table
    db.prepare("UPDATE users SET role = ? WHERE LOWER(email) = ?").run(role, lowerEmail);

    res.json({ id: Number(info.lastInsertRowid), email: lowerEmail, role });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "This email is already in the access control list." });
    }
    res.status(500).json({ error: err.message });
  }
});

usersRouter.put("/access-control/:id", (req, res) => {
  const { id } = req.params;
  const { email, role } = req.body ?? {};
  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }
  if (!["admin", "approver", "requestor"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin', 'approver', or 'requestor'" });
  }

  try {
    // Get current email first so we can update user table
    const current = db.prepare("SELECT email FROM access_control WHERE id = ?").get(id) as { email: string } | undefined;
    if (!current) {
      return res.status(404).json({ error: "Access control entry not found" });
    }

    const finalEmail = email ? email.trim().toLowerCase() : current.email;

    db.prepare("UPDATE access_control SET email = ?, role = ? WHERE id = ?").run(finalEmail, role, id);

    // Propagate to users table
    db.prepare("UPDATE users SET role = ?, email = ? WHERE LOWER(email) = ?").run(role, finalEmail, current.email.toLowerCase());

    res.json({ id: Number(id), email: finalEmail, role });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "This email is already in the access control list." });
    }
    res.status(500).json({ error: err.message });
  }
});

usersRouter.delete("/access-control/:id", (req, res) => {
  const { id } = req.params;
  try {
    const current = db.prepare("SELECT email FROM access_control WHERE id = ?").get(id) as { email: string } | undefined;
    if (!current) {
      return res.status(404).json({ error: "Access control entry not found" });
    }

    db.prepare("DELETE FROM access_control WHERE id = ?").run(id);

    // Revert role in users table to requester/requestor
    db.prepare("UPDATE users SET role = 'requestor' WHERE LOWER(email) = ?").run(current.email.toLowerCase());

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


