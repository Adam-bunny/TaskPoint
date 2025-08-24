import { users, tasks, type User, type InsertUser, type Task, type InsertTask, type UpdateTask } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: "user" | "admin" }): Promise<User>;
  
  // Task operations
  createTask(task: InsertTask & { submittedBy: string; points: number }): Promise<Task>;
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getPendingTasks(): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  updateTask(id: string, updates: Partial<UpdateTask & { reviewedBy: string; reviewedAt: Date }>): Promise<Task | undefined>;
  
  // Points and leaderboard
  updateUserPoints(userId: string, pointsToAdd: number): Promise<void>;
  getLeaderboard(limit?: number): Promise<User[]>;
  getUserStats(userId: string): Promise<{
    totalPoints: number;
    completedTasks: number;
    pendingTasks: number;
    rank: number;
  }>;
  
  // Admin stats
  getAdminStats(): Promise<{
    pendingTasks: number;
    approvedToday: number;
    pointsDistributed: number;
    activeUsers: number;
  }>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { role?: "user" | "admin" }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        role: insertUser.role || "user",
      })
      .returning();
    return user;
  }

  async createTask(task: InsertTask & { submittedBy: string; points: number }): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.submittedBy, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getPendingTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "pending"))
      .orderBy(desc(tasks.createdAt));
  }

  async getAllTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: string, updates: Partial<UpdateTask & { reviewedBy: string; reviewedAt: Date }>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async updateUserPoints(userId: string, pointsToAdd: number): Promise<void> {
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${pointsToAdd}`
      })
      .where(eq(users.id, userId));
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "user"))
      .orderBy(desc(users.totalPoints))
      .limit(limit);
  }

  async getUserStats(userId: string): Promise<{
    totalPoints: number;
    completedTasks: number;
    pendingTasks: number;
    rank: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { totalPoints: 0, completedTasks: 0, pendingTasks: 0, rank: 0 };
    }

    const userTasks = await this.getTasksByUser(userId);
    const completedTasks = userTasks.filter(task => task.status === "approved").length;
    const pendingTasks = userTasks.filter(task => task.status === "pending").length;

    // Calculate rank
    const [rankResult] = await db
      .select({ rank: sql<number>`ROW_NUMBER() OVER (ORDER BY total_points DESC)` })
      .from(users)
      .where(and(eq(users.role, "user"), eq(users.id, userId)));

    return {
      totalPoints: user.totalPoints,
      completedTasks,
      pendingTasks,
      rank: rankResult?.rank || 0,
    };
  }

  async getAdminStats(): Promise<{
    pendingTasks: number;
    approvedToday: number;
    pointsDistributed: number;
    activeUsers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingTasksResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(eq(tasks.status, "pending"));

    const [approvedTodayResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(and(
        eq(tasks.status, "approved"),
        sql`DATE(reviewed_at) = CURRENT_DATE`
      ));

    const [pointsResult] = await db
      .select({ total: sql<number>`SUM(total_points)` })
      .from(users)
      .where(eq(users.role, "user"));

    const [activeUsersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.role, "user"));

    return {
      pendingTasks: pendingTasksResult?.count || 0,
      approvedToday: approvedTodayResult?.count || 0,
      pointsDistributed: pointsResult?.total || 0,
      activeUsers: activeUsersResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
