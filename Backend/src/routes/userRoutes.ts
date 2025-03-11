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

export default router;
