import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { ObjectId } from "mongodb";

export interface BrandingSettings {
  _id?: string;
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicWebsite: string;
  clinicLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  timezone: string;
  bookingApprovalRequired: boolean;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  reminderHoursBefore: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  customCSS?: string;
  customHTML?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  clinicName: "Medical Clinic",
  clinicEmail: "contact@clinic.com",
  clinicPhone: "+1 (555) 123-4567",
  clinicAddress: "123 Medical Street, City, State 12345",
  clinicWebsite: "https://clinic.com",
  primaryColor: "#0097C2",
  secondaryColor: "#00B4B4",
  accentColor: "#E63946",
  fontFamily: "system-ui, -apple-system, sans-serif",
  timezone: "America/New_York",
  bookingApprovalRequired: false,
  notificationsEnabled: true,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: true,
  reminderHoursBefore: 24,
  businessHoursStart: "09:00",
  businessHoursEnd: "17:00",
};

// Get branding settings
export const getBrandingSettings: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    let settings = await db.collection("settings").findOne({});

    if (!settings) {
      // Initialize with default settings
      await db.collection("settings").insertOne({
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      settings = {
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    res.json(settings as BrandingSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// Update branding settings (admin only)
export const updateBrandingSettings: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const updates = req.body;

    // Fetch current settings
    const currentSettings = await db.collection("settings").findOne({});

    if (!currentSettings) {
      // Initialize settings if they don't exist
      const newSettings = {
        ...DEFAULT_SETTINGS,
        ...updates,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection("settings").insertOne(newSettings);
      return res.json(newSettings as BrandingSettings);
    }

    // Update existing settings
    const updated = await db.collection("settings").findOneAndUpdate(
      {},
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updated.value) {
      return res.status(500).json({ error: "Failed to update settings" });
    }

    res.json(updated.value as BrandingSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// Get public branding settings (no auth required)
export const getPublicBrandingSettings: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    let settings = await db.collection("settings").findOne({});

    if (!settings) {
      settings = {
        ...DEFAULT_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Return only public-facing settings
    const publicSettings = {
      clinicName: settings.clinicName,
      clinicEmail: settings.clinicEmail,
      clinicPhone: settings.clinicPhone,
      clinicAddress: settings.clinicAddress,
      clinicWebsite: settings.clinicWebsite,
      clinicLogo: settings.clinicLogo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      fontFamily: settings.fontFamily,
      timezone: settings.timezone,
      businessHoursStart: settings.businessHoursStart,
      businessHoursEnd: settings.businessHoursEnd,
    };

    res.json(publicSettings);
  } catch (error) {
    console.error("Error fetching public settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// Get notification settings
export const getNotificationSettings: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    let settings = await db.collection("settings").findOne({});

    if (!settings) {
      settings = DEFAULT_SETTINGS;
    }

    const notificationSettings = {
      notificationsEnabled: settings.notificationsEnabled,
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
      smsNotificationsEnabled: settings.smsNotificationsEnabled,
      reminderHoursBefore: settings.reminderHoursBefore,
      bookingApprovalRequired: settings.bookingApprovalRequired,
    };

    res.json(notificationSettings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
};

// Reset settings to default
export const resetSettings: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();

    const resetSettings = {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("settings").findOneAndUpdate(
      {},
      { $set: resetSettings },
      { upsert: true, returnDocument: "after" }
    );

    res.json(result.value as BrandingSettings);
  } catch (error) {
    console.error("Error resetting settings:", error);
    res.status(500).json({ error: "Failed to reset settings" });
  }
};
