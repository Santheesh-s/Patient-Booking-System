import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { Service } from "@shared/types";
import { ObjectId } from "mongodb";
import { logAuditAction, detectChanges } from "./audit";

export const getServices: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const services = await db.collection("services").find({}).toArray();
    res.json(services as Service[]);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
};

export const getServiceById: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const service = await db.collection("services").findOne({ _id: new ObjectId(id) });
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(service as Service);
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ error: "Failed to fetch service" });
  }
};

export const createService: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const service: Service = req.body;
    const result = await db.collection("services").insertOne(service);

    // Log audit action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "create",
      "service",
      result.insertedId.toString(),
      service.name,
      service,
      "success",
      undefined,
      req.ip,
      req.get("User-Agent")
    );

    res.json({ _id: result.insertedId, ...service });
  } catch (error) {
    console.error("Error creating service:", error);

    // Log failed action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "create",
      "service",
      "unknown",
      req.body.name,
      {},
      "failure",
      error instanceof Error ? error.message : "Unknown error",
      req.ip,
      req.get("User-Agent")
    );

    res.status(500).json({ error: "Failed to create service" });
  }
};

export const updateService: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const updates = req.body;

    // Fetch before state
    const beforeService = await db.collection("services").findOne({ _id: new ObjectId(id) });
    if (!beforeService) {
      return res.status(404).json({ error: "Service not found" });
    }

    // If provider, check if they provide this service
    if (req.user?.role === "provider" && req.user?.providerId) {
      if (!beforeService.providers?.includes(req.user.providerId)) {
        return res.status(403).json({ error: "You can only manage services you provide" });
      }
    }

    const result = await db.collection("services").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Log audit action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "update",
      "service",
      id,
      beforeService.name,
      detectChanges(beforeService, { ...beforeService, ...updates }),
      "success",
      undefined,
      req.ip,
      req.get("User-Agent")
    );

    res.json({ success: true, message: "Service updated" });
  } catch (error) {
    console.error("Error updating service:", error);

    // Log failed action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "update",
      "service",
      req.params.id,
      "Unknown",
      {},
      "failure",
      error instanceof Error ? error.message : "Unknown error",
      req.ip,
      req.get("User-Agent")
    );

    res.status(500).json({ error: "Failed to update service" });
  }
};

export const deleteService: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    // Fetch service before deletion
    const service = await db.collection("services").findOne({ _id: new ObjectId(id) });
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // If provider, check if they provide this service
    if (req.user?.role === "provider" && req.user?.providerId) {
      if (!service.providers?.includes(req.user.providerId)) {
        return res.status(403).json({ error: "You can only manage services you provide" });
      }
    }

    const result = await db.collection("services").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Log audit action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "delete",
      "service",
      id,
      service.name,
      service,
      "success",
      undefined,
      req.ip,
      req.get("User-Agent")
    );

    res.json({ success: true, message: "Service deleted" });
  } catch (error) {
    console.error("Error deleting service:", error);

    // Log failed action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "delete",
      "service",
      req.params.id,
      "Unknown",
      {},
      "failure",
      error instanceof Error ? error.message : "Unknown error",
      req.ip,
      req.get("User-Agent")
    );

    res.status(500).json({ error: "Failed to delete service" });
  }
};
