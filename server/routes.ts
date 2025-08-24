import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, assignTaskSchema, completeTaskSchema, TASK_POINTS } from "@shared/schema";

// Ensure upload directory exists
const uploadDir = 'uploads/proof-files/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload configuration
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: uploadStorage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);
  
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Only authenticated users can access uploads
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  }, express.static('uploads'));

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

  // Admin: Assign task to user
  app.post("/api/admin/assign-task", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const validatedData = assignTaskSchema.parse(req.body);
      
      const task = await storage.assignTask({
        ...validatedData,
        assignedBy: req.user!.id,
        status: "assigned" as const,
      });

      // Notify the assigned user
      app.locals.sendNotification(validatedData.assignedTo, {
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new ${validatedData.type} task: "${validatedData.title}". Deadline: ${validatedData.deadline.toLocaleDateString()}`,
        taskId: task.id,
        deadline: validatedData.deadline.toISOString(),
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task assignment data" });
    }
  });

  // Get assigned tasks for user
  app.get("/api/tasks/assigned", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const tasks = await storage.getAssignedTasks(req.user!.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned tasks" });
    }
  });

  // Complete assigned task with proof upload
  app.post("/api/tasks/:id/complete", upload.single('proofFile'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTaskById(taskId);

      if (!task || task.assignedTo !== req.user!.id) {
        return res.status(404).json({ message: "Task not found or not assigned to you" });
      }

      if (task.status !== "assigned" && task.status !== "in_progress") {
        return res.status(400).json({ message: "Task cannot be completed" });
      }

      const proofFilePath = req.file ? `/uploads/proof-files/${req.file.filename}` : undefined;

      const updatedTask = await storage.completeTask(taskId, {
        proofFile: proofFilePath,
        status: "completed" as const,
        completedAt: new Date(),
      });

      // Notify the admin who assigned the task
      if (task.assignedBy) {
        app.locals.sendNotification(task.assignedBy, {
          type: 'task_completed',
          title: 'Task Completed',
          message: `${req.user!.username} has completed the assigned task: "${task.title}" and uploaded proof for review.`,
          taskId: task.id,
          timestamp: new Date().toISOString(),
        });
      }

      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Get all users (for admin task assignment)
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "admin") {
      return res.sendStatus(403);
    }

    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
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
