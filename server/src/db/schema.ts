import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  firebaseUid: text("firebase_uid"),
  role: text("role").default("requestor").notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  shift: text("shift").notNull(), // 'morning', 'afternoon', 'night'
  status: text("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
  reason: text("reason"),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accessControl = pgTable("access_control", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  role: text("role").notNull(), // 'admin', 'approver', 'requestor'
});
