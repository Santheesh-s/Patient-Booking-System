import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { Provider, ProviderAvailability } from "@shared/types";
import { ObjectId } from "mongodb";

export const getProviders: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const serviceId = req.query.serviceId as string | undefined;

    let query: any = {};
    if (serviceId) {
      query.services = serviceId;
    }

    const raw = await db.collection("providers").find(query).toArray();
    const providers: Provider[] = raw.map(d => ({
      _id: String(d._id),
      name: d.name || "",
      email: d.email || "",
      phone: d.phone || "",
      speciality: d.speciality || "",
      services: Array.isArray(d.services) ? d.services.map(String) : [],
    }));
    res.json(providers);
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({ error: "Failed to fetch providers" });
  }
};

export const getProviderById: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const doc = await db.collection("providers").findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ error: "Provider not found" });
    const provider: Provider = {
      _id: String(doc._id),
      name: doc.name || "",
      email: doc.email || "",
      phone: doc.phone || "",
      speciality: doc.speciality || "",
      services: Array.isArray(doc.services) ? doc.services.map(String) : [],
    };
    res.json(provider);
  } catch (error) {
    console.error("Error fetching provider:", error);
    res.status(500).json({ error: "Failed to fetch provider" });
  }
};

export const createProvider: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const provider: Provider = req.body;
    const { _id, ...insertable } = provider; // drop potential string _id
    const result = await db.collection("providers").insertOne(insertable as any);
    res.json({ _id: String(result.insertedId), ...insertable });
  } catch (error) {
    console.error("Error creating provider:", error);
    res.status(500).json({ error: "Failed to create provider" });
  }
};

export const updateProvider: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const result = await db.collection("providers").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    res.json({ success: true, message: "Provider updated" });
  } catch (error) {
    console.error("Error updating provider:", error);
    res.status(500).json({ error: "Failed to update provider" });
  }
};

export const deleteProvider: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const result = await db.collection("providers").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    res.json({ success: true, message: "Provider deleted" });
  } catch (error) {
    console.error("Error deleting provider:", error);
    res.status(500).json({ error: "Failed to delete provider" });
  }
};

export const getProviderAvailability: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const doc = await db.collection("availability").findOne({ providerId: id });
    if (!doc) return res.status(404).json({ error: "Availability not found" });
    const availability: ProviderAvailability = {
      _id: doc._id ? String(doc._id) : undefined,
      providerId: String(doc.providerId),
      businessHours: Array.isArray(doc.businessHours) ? doc.businessHours : [],
      blockedDates: Array.isArray(doc.blockedDates) ? doc.blockedDates : [],
    };
    res.json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
};

export const updateProviderAvailability: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const availability: ProviderAvailability = req.body;

    const { _id, ...payload } = availability; // ensure no string _id conflicts
    await db.collection("availability").updateOne(
      { providerId: id },
      { $set: payload },
      { upsert: true }
    );
    res.json({ success: true, message: "Availability updated" });
  } catch (error) {
    console.error("Error updating availability:", error);
    res.status(500).json({ error: "Failed to update availability" });
  }
};
