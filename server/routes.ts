import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, TASK_POINTS } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Task submission
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const points = TASK_POINTS[validatedData.type] || 0;
      
      const task = await storage.createTask({
        ...validatedData,
        submittedBy: req.user!.id,
        points,
      });

      // Notify all admins about new task submission
      app.locals.notifyAdmins({
        type: 'task_submitted',
        title: 'New Task Submitted',
        message: `User ${req.user!.username} submitted a new ${validatedData.type} task: "${validatedData.title}"`,
        taskId: task.id,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Get user's tasks
  app.get("/api/tasks/my", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const tasks = await storage.getTasksByUser(req.user!.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get pending tasks (admin only)
  app.get("/api/tasks/pending", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const tasks = await storage.getPendingTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // Review task (admin only)
  app.patch("/api/tasks/:id/review", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const validatedData = updateTaskSchema.parse(req.body);
      
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updatedTask = await storage.updateTask(id, {
        ...validatedData,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      });

      // Award points if approved
      if (validatedData.status === "approved" && validatedData.points) {
        await storage.updateUserPoints(task.submittedBy, validatedData.points);
      }

      // Notify the task submitter about the review decision
      app.locals.sendNotification(task.submittedBy, {
        type: 'task_reviewed',
        title: validatedData.status === 'approved' ? 'Task Approved!' : 'Task Rejected',
        message: validatedData.status === 'approved' 
          ? `Your task "${task.title}" was approved and you earned ${validatedData.points} points!`
          : `Your task "${task.title}" was rejected. ${validatedData.rejectionReason || 'Please review and resubmit.'}`,
        taskId: task.id,
        status: validatedData.status,
        points: validatedData.status === 'approved' ? validatedData.points : 0,
        timestamp: new Date().toISOString(),
      });

      res.json(updatedTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const leaderboard = await storage.getLeaderboard(10);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get user stats
  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Get admin stats
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by user ID
  const clients = new Map();
  
  wss.on('connection', (ws, request) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'identify' && data.userId) {
          clients.set(data.userId, ws);
          console.log(`User ${data.userId} identified for notifications`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
    });
  });
  
  // Helper function to send notifications
  app.locals.sendNotification = (userId, notification) => {
    const client = clients.get(userId);
    if (client && client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(notification));
    }
  };
  
  // Helper function to notify all admins
  app.locals.notifyAdmins = async (notification) => {
    try {
      // Get all admin users
      const adminUsers = await storage.db?.select().from(storage.users).where(storage.eq(storage.users.role, "admin")) || [];
      
      adminUsers.forEach(admin => {
        const client = clients.get(admin.id);
        if (client && client.readyState === 1) {
          client.send(JSON.stringify(notification));
        }
      });
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };
  
  return httpServer;
}
