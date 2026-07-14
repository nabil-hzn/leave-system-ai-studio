import { Router } from "express";
import { db } from "../db.js";

export const usersRouter = Router();

usersRouter.get("/", (_req, res) => {
  const users = db.prepare("SELECT id, name, email, picture, role FROM users ORDER BY name").all();
  res.json(users);
});
