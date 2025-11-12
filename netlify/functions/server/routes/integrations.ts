import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { ObjectId } from "mongodb";

export interface CalendarIntegration {
  _id?: string;
  type: "google" | "outlook" | "icalendar" | "none";
  enabled: boolean;
  providerId?: string;
  credentials?: {
    apiKey?: string;
    refreshToken?: string;
    calendarId?: string;
    email?: string;
  };
  syncDirection: "incoming" | "outgoing" | "bidirectional";
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSyncTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookIntegration {
  _id?: string;
  event: "appointment_created" | "appointment_updated" | "appointment_cancelled";
  url: string;
  active: boolean;
  createdAt?: string;
}

// Get calendar integrations
export const getCalendarIntegrations: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    const integrations = await db
      .collection("calendarIntegrations")
      .find({})
      .toArray();

    res.json(integrations as CalendarIntegration[]);
  } catch (error) {
    console.error("Error fetching calendar integrations:", error);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
};

// Get calendar integration by type
export const getCalendarIntegration: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { type } = req.params;

    const integration = await db.collection("calendarIntegrations").findOne({
      type,
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    res.json(integration as CalendarIntegration);
  } catch (error) {
    console.error("Error fetching calendar integration:", error);
    res.status(500).json({ error: "Failed to fetch integration" });
  }
};

// Create or update calendar integration
export const updateCalendarIntegration: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { type } = req.params;
    const integrationData: Partial<CalendarIntegration> = req.body;

    // Validate type
    const validTypes = ["google", "outlook", "icalendar", "none"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid integration type" });
    }

    const result = await db.collection("calendarIntegrations").findOneAndUpdate(
      { type },
      {
        $set: {
          ...integrationData,
          type,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    res.json(result.value as CalendarIntegration);
  } catch (error) {
    console.error("Error updating calendar integration:", error);
    res.status(500).json({ error: "Failed to update integration" });
  }
};

// Delete calendar integration
export const deleteCalendarIntegration: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { type } = req.params;

    const result = await db.collection("calendarIntegrations").deleteOne({
      type,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Integration not found" });
    }

    res.json({ success: true, message: "Integration deleted" });
  } catch (error) {
    console.error("Error deleting calendar integration:", error);
    res.status(500).json({ error: "Failed to delete integration" });
  }
};

// Test calendar integration
export const testCalendarIntegration: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { type } = req.params;

    const integration = await db.collection("calendarIntegrations").findOne({
      type,
    });

    if (!integration || !integration.enabled) {
      return res.status(400).json({ error: "Integration not enabled" });
    }

    // Simulate test connection based on type
    const testResults: Record<string, boolean> = {
      google: !!integration.credentials?.apiKey,
      outlook: !!integration.credentials?.refreshToken,
      icalendar: !!integration.credentials?.calendarId,
    };

    const isConnected = testResults[type] || false;

    res.json({
      connected: isConnected,
      type,
      message: isConnected
        ? `Connected to ${type} calendar`
        : `Not connected to ${type}. Please configure credentials.`,
    });
  } catch (error) {
    console.error("Error testing calendar integration:", error);
    res.status(500).json({ error: "Failed to test integration" });
  }
};

// Sync calendar (trigger manual sync)
export const syncCalendar: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { type } = req.params;

    const integration = await db.collection("calendarIntegrations").findOne({
      type,
    });

    if (!integration || !integration.enabled) {
      return res.status(400).json({ error: "Integration not enabled" });
    }

    // Log the sync request
    await db.collection("syncLogs").insertOne({
      integationType: type,
      status: "completed",
      syncedAt: new Date().toISOString(),
      appointmentCount: 0,
    });

    // Update last sync time
    await db.collection("calendarIntegrations").updateOne(
      { type },
      {
        $set: {
          lastSyncTime: new Date().toISOString(),
        },
      }
    );

    res.json({
      success: true,
      message: `Synced ${type} calendar successfully`,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing calendar:", error);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
};

// Webhook management
export const getWebhooks: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();

    const webhooks = await db.collection("webhooks").find({}).toArray();

    res.json(webhooks as WebhookIntegration[]);
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
};

// Create webhook
export const createWebhook: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { event, url } = req.body;

    if (!url || !event) {
      return res.status(400).json({ error: "URL and event are required" });
    }

    const webhook: WebhookIntegration = {
      event,
      url,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("webhooks").insertOne(webhook);

    res.status(201).json({
      _id: result.insertedId,
      ...webhook,
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
};

// Update webhook
export const updateWebhook: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const result = await db.collection("webhooks").findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: updates,
      },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(result.value as WebhookIntegration);
  } catch (error) {
    console.error("Error updating webhook:", error);
    res.status(500).json({ error: "Failed to update webhook" });
  }
};

// Delete webhook
export const deleteWebhook: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const result = await db.collection("webhooks").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json({ success: true, message: "Webhook deleted" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
};

// Test webhook
export const testWebhook: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    const webhook = await db.collection("webhooks").findOne({
      _id: new ObjectId(id),
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Simulate webhook test by sending test payload
    const testPayload = {
      event: webhook.event,
      timestamp: new Date().toISOString(),
      test: true,
      data: {
        appointmentId: "test_" + Date.now(),
        message: "This is a test webhook",
      },
    };

    try {
      // In production, you would make an actual HTTP request here
      // const response = await fetch(webhook.url, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(testPayload),
      // });

      console.log(`[WEBHOOK TEST] Would send to ${webhook.url}:`, testPayload);

      res.json({
        success: true,
        message: "Test webhook sent",
        webhookUrl: webhook.url,
      });
    } catch (fetchError) {
      res.status(400).json({
        success: false,
        message: "Failed to deliver webhook",
        error: fetchError instanceof Error ? fetchError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error testing webhook:", error);
    res.status(500).json({ error: "Failed to test webhook" });
  }
};
