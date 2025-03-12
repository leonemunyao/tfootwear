import { Express, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = require("express").Router();

// Get all users
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log("Fetching all users...");
    const users = await prisma.user.findMany();
    console.log("Fetched all users.");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users...", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Get a user by id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    console.log("Fetching user...");
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    console.log("Fetched user.", user);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user...", error);
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

// Create a new user
router.post("/", async (req: Request, res: Response) => {
    try {
      console.log("Creating a new user...");
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Please provide name, email, and password." });
      }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });
    console.log("Created a new user.", user);
    res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user...", error);
      res.status(500).json({ error: "Failed to create user." });
    }
    });

  // Update a user details
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      console.log("Updating user...");
      const { id } = req.params;
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Please provide name, email, and password." });
      }
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          name,
          email,
          password,
        },
      });
      console.log("Updated user.", user);
      res.json(user);
    } catch (error) {
      console.error("Error updating user...", error);
      res.status(500).json({ error: "Failed to update user." });
    }
  });

  // Updating specific data for the user eg. Name
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      console.log("Updating user...");
      const { id } = req.params;
      const { name, email, password } = req.body;
      if (!name && !email && !password) {
        return res.status(400).json({ error: "Please provide name, email, or password to update." });
      }
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          name,
          email,
          password,
        },
      });
      console.log("Updated user.", user);
      res.json(user);
    } catch (error) {
      console.error("Error updating user...", error);
      res.status(500).json({ error: "Failed to update user." });
    }
  });

  // Delete a user by id
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      console.log("Deleting user...");
      const { id } = req.params;
      const user = await prisma.user.delete({
        where: { id: parseInt(id) },
      });
      console.log("Deleted user.", user);
      res.json(user);
    } catch (error) {
      console.error("Error deleting user...", error);
      res.status(500).json({ error: "Failed to delete user." });
    }
  });

  // Delete all users
  router.delete("/", async (req: Request, res: Response) => {
    try {
      console.log("Deleting all users...");
      const users = await prisma.user.deleteMany();
      console.log("Deleted all users.", users);
      res.json(users);
    } catch (error) {
      console.error("Error deleting users...", error);
      res.status(500).json({ error: "Failed to delete users." });
    }
  });

export default router;
