import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "approved", "rejected"]);
export const taskTypeEnum = pgEnum("task_type", ["content_creation", "bug_report", "feature_request", "community_help", "documentation"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: taskTypeEnum("type").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  points: integer("points").notNull(),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submittedTasks: many(tasks, { relationName: "submittedTasks" }),
  reviewedTasks: many(tasks, { relationName: "reviewedTasks" }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  submitter: one(users, {
    fields: [tasks.submittedBy],
    references: [users.id],
    relationName: "submittedTasks",
  }),
  reviewer: one(users, {
    fields: [tasks.reviewedBy],
    references: [users.id],
    relationName: "reviewedTasks",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
}).extend({
  role: z.enum(["user", "admin"]).optional(),
});

export const insertAdminUserSchema = insertUserSchema.extend({
  adminCode: z.string().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  type: true,
});

export const updateTaskSchema = createInsertSchema(tasks).pick({
  status: true,
  points: true,
  rejectionReason: true,
}).extend({
  status: z.enum(["approved", "rejected"]),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Task type point mappings
export const TASK_POINTS: Record<string, number> = {
  content_creation: 50,
  bug_report: 25,
  feature_request: 30,
  community_help: 20,
  documentation: 40,
};
