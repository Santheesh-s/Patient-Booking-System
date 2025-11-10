import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { hashPassword, verifyPassword, generateToken } from "../auth";
import { User } from "@shared/types";

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // If provider, fetch the provider document to get the providerId
    let providerId: string | undefined;
    if (user.role === "provider") {
      const provider = await db.collection("providers").findOne({ email });
      if (provider) {
        providerId = provider._id.toString();
      }
    }

    const userWithProviderId = { ...user, providerId } as User;
    const token = generateToken(userWithProviderId);

    const responseUser: any = {
      _id: user._id,
      email: user.email,
      role: user.role,
    };

    if (providerId) {
      responseUser.providerId = providerId;
    }

    res.json({
      token,
      user: responseUser,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role are required" });
    }

    const db = await getDatabase();
    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = hashPassword(password);
    const user: User = {
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("users").insertOne(user);

    const token = generateToken({ ...user, _id: result.insertedId } as User);
    res.status(201).json({
      token,
      user: {
        _id: result.insertedId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const me: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
