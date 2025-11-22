import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { hashPassword } from "../auth";
import { Service, Provider, ProviderAvailability, User } from "@shared/types";

export const initializeDatabase: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    // Check if already initialized
    const userCount = await db.collection("users").countDocuments();
    if (userCount > 0) {
      return res.json({ message: "Database already initialized" });
    }

    // Create demo admin user
    const adminUser: User = {
      email: "admin@clinic.com",
      password: hashPassword("admin123"),
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    await db.collection("users").insertOne(adminUser);

    // Create demo provider document first
    const provider: Provider = {
      name: "Dr. Sarah Smith",
      email: "dr.smith@clinic.com",
      phone: "+1 (555) 123-4567",
      speciality: "General Medicine",
      services: [],
    };
    const providerResult = await db.collection("providers").insertOne(provider);

    // Create demo provider user with link to provider document
    const providerUser: User = {
      email: "dr.smith@clinic.com",
      password: hashPassword("provider123"),
      role: "provider",
      providerId: providerResult.insertedId.toString(),
      createdAt: new Date().toISOString(),
    };
    await db.collection("users").insertOne(providerUser);

    // Create demo services with provider ID
    const services: Service[] = [
      {
        name: "General Consultation",
        description: "Standard medical consultation with healthcare provider",
        duration: 30,
        providers: [providerResult.insertedId.toString()],
        customFields: [
          {
            name: "Chief Complaint",
            type: "text",
            required: true,
            order: 1,
          },
          {
            name: "Additional Notes",
            type: "textarea",
            required: false,
            order: 2,
          },
        ],
      },
      {
        name: "Follow-up Visit",
        description: "Follow-up consultation for existing patients",
        duration: 20,
        providers: [providerResult.insertedId.toString()],
        customFields: [
          {
            name: "Previous Visit Date",
            type: "text",
            required: true,
            order: 1,
          },
        ],
      },
      {
        name: "Health Screening",
        description: "Comprehensive health check-up and screening",
        duration: 45,
        providers: [providerResult.insertedId.toString()],
        customFields: [
          {
            name: "Do you have any allergies?",
            type: "checkbox",
            required: false,
            order: 1,
          },
          {
            name: "Current Medications",
            type: "textarea",
            required: false,
            order: 2,
          },
        ],
      },
    ];

    const servicesResult = await db.collection("services").insertMany(services);

    // Update provider with service IDs
    const serviceIds = Object.values(servicesResult.insertedIds).map((id) => id.toString());
    await db.collection("providers").updateOne(
      { _id: providerResult.insertedId },
      {
        $set: {
          services: serviceIds,
        },
      }
    );

    // Create provider availability
    const availability: ProviderAvailability = {
      providerId: providerResult.insertedId.toString(),
      businessHours: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isOpen: true },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isOpen: true },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isOpen: true },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isOpen: true },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isOpen: true },
        { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isOpen: false },
        { dayOfWeek: 6, startTime: "00:00", endTime: "00:00", isOpen: false },
      ],
      blockedDates: [],
    };
    await db.collection("availability").insertOne(availability);

    res.json({
      success: true,
      message: "Database initialized successfully",
      demo: {
        adminEmail: "admin@clinic.com",
        adminPassword: "admin123",
        providerEmail: "dr.smith@clinic.com",
        providerPassword: "provider123",
      },
    });
  } catch (error) {
    console.error("Error initializing database:", error);
    res.status(500).json({ error: "Failed to initialize database" });
  }
};
