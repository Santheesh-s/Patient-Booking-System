import { getDatabase } from "./db";
import { sendBookingNotifications } from "./routes/notifications";

interface ScheduledReminder {
  appointmentId: string;
  sendTime: Date;
  type: "email" | "sms" | "both";
}

const scheduledReminders: Map<string, NodeJS.Timeout> = new Map();

// Initialize scheduler on server start
export async function initializeScheduler() {
  console.log("🔔 Appointment Reminder Scheduler initialized");

  // Run scheduler every minute to check for due reminders
  setInterval(checkDueReminders, 60000);

  // Load and schedule existing appointments
  await scheduleExistingAppointments();
}

// Schedule reminders for existing appointments
async function scheduleExistingAppointments() {
  try {
    const db = await getDatabase();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get all appointments within the next 30 days that don't have reminders sent
    const appointments = await db
      .collection("appointments")
      .find({
        startTime: { $gte: now.toISOString(), $lte: thirtyDaysFromNow.toISOString() },
        status: { $in: ["confirmed", "pending"] },
        reminderSent: { $ne: true },
      })
      .toArray();

    for (const apt of appointments) {
      const reminderTime = new Date(new Date(apt.startTime).getTime() - 24 * 60 * 60 * 1000); // 24 hours before

      if (reminderTime > now) {
        scheduleReminder(apt._id.toString(), reminderTime, "both");
      }
    }

    console.log(`📅 Scheduled ${appointments.length} appointment reminders`);
  } catch (error) {
    console.error("Error scheduling existing appointments:", error);
  }
}

// Schedule a reminder for a specific appointment
export function scheduleReminder(
  appointmentId: string,
  sendTime: Date,
  type: "email" | "sms" | "both" = "both"
) {
  const key = `${appointmentId}_${sendTime.getTime()}`;

  if (scheduledReminders.has(key)) {
    clearTimeout(scheduledReminders.get(key));
  }

  const delayMs = sendTime.getTime() - Date.now();

  if (delayMs > 0) {
    const timeout = setTimeout(async () => {
      await sendReminder(appointmentId, type);
      scheduledReminders.delete(key);
    }, delayMs);

    scheduledReminders.set(key, timeout);
    console.log(
      `⏰ Reminder scheduled for appointment ${appointmentId} at ${sendTime.toISOString()}`
    );
  }
}

// Send reminder notification
async function sendReminder(appointmentId: string, type: "email" | "sms" | "both") {
  try {
    const db = await getDatabase();
    const ObjectId = (await import("mongodb")).ObjectId;

    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      console.error(`Appointment ${appointmentId} not found`);
      return;
    }

    const service = await db.collection("services").findOne({
      _id: new ObjectId(appointment.serviceId),
    });

    const provider = await db.collection("providers").findOne({
      _id: new ObjectId(appointment.providerId),
    });

    const serviceName = service?.name || "Appointment";
    const providerName = provider?.name || "Healthcare Provider";

    const variables = {
      patientName: appointment.patientName,
      serviceName,
      providerName,
      appointmentDate: new Date(appointment.startTime).toLocaleDateString(),
      appointmentTime: new Date(appointment.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const reminderTemplate = `Hello {{patientName}},

This is a reminder about your {{serviceName}} appointment with {{providerName}}.

📅 Date: {{appointmentDate}}
🕐 Time: {{appointmentTime}}

Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.

Thank you,
The Clinic Team`;

    const reminderMessage = interpolateTemplate(reminderTemplate, variables);

    // Send email reminder
    if (type === "email" || type === "both") {
      // In production, implement actual email sending
      console.log(`📧 Reminder email sent to ${appointment.patientEmail}`);
    }

    // Send SMS reminder
    if (type === "sms" || type === "both") {
      const smsTemplate = `Reminder: {{serviceName}} with {{providerName}} on {{appointmentDate}} at {{appointmentTime}}. Please arrive 10 minutes early.`;
      const smsMessage = interpolateTemplate(smsTemplate, variables);
      // In production, implement actual SMS sending
      console.log(`📱 Reminder SMS sent to ${appointment.patientPhone}`);
    }

    // Mark reminder as sent
    await db.collection("appointments").updateOne(
      { _id: new ObjectId(appointmentId) },
      { $set: { reminderSent: true, reminderSentAt: new Date().toISOString() } }
    );

    // Log reminder
    await db.collection("reminderLogs").insertOne({
      appointmentId: new ObjectId(appointmentId),
      type,
      sentAt: new Date().toISOString(),
      status: "sent",
    });
  } catch (error) {
    console.error(`Error sending reminder for appointment ${appointmentId}:`, error);

    // Log failed reminder
    try {
      const db = await getDatabase();
      const ObjectId = (await import("mongodb")).ObjectId;
      await db.collection("reminderLogs").insertOne({
        appointmentId: new ObjectId(appointmentId),
        type,
        sentAt: new Date().toISOString(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Error logging reminder failure:", logError);
    }
  }
}

// Check for reminders that are due and send them
async function checkDueReminders() {
  try {
    const db = await getDatabase();
    const ObjectId = (await import("mongodb")).ObjectId;
    const now = new Date();

    // Get settings to check reminder hours
    const settings = await db.collection("settings").findOne({});
    const reminderHours = settings?.reminderHoursBefore || 24;
    const reminderTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

    // Find appointments that need reminders
    const appointmentsNeedingReminders = await db
      .collection("appointments")
      .find({
        startTime: {
          $gte: now.toISOString(),
          $lte: reminderTime.toISOString(),
        },
        status: { $in: ["confirmed", "pending"] },
        reminderSent: { $ne: true },
      })
      .toArray();

    for (const apt of appointmentsNeedingReminders) {
      const reminderSettings = settings || { emailNotificationsEnabled: true, smsNotificationsEnabled: true };
      let type: "email" | "sms" | "both" = "both";

      if (reminderSettings.emailNotificationsEnabled && !reminderSettings.smsNotificationsEnabled) {
        type = "email";
      } else if (!reminderSettings.emailNotificationsEnabled && reminderSettings.smsNotificationsEnabled) {
        type = "sms";
      }

      await sendReminder(apt._id.toString(), type);
    }

    if (appointmentsNeedingReminders.length > 0) {
      console.log(`📬 Sent ${appointmentsNeedingReminders.length} appointment reminders`);
    }
  } catch (error) {
    console.error("Error checking due reminders:", error);
  }
}

// Cancel scheduled reminder
export function cancelReminder(appointmentId: string) {
  const keys = Array.from(scheduledReminders.keys()).filter((key) =>
    key.startsWith(appointmentId)
  );

  for (const key of keys) {
    clearTimeout(scheduledReminders.get(key));
    scheduledReminders.delete(key);
  }

  console.log(`❌ Reminder cancelled for appointment ${appointmentId}`);
}

// Utility function to interpolate template variables
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
}

// Get reminder statistics
export async function getReminderStats() {
  try {
    const db = await getDatabase();

    const [totalReminders, sentReminders, failedReminders] = await Promise.all([
      db.collection("reminderLogs").countDocuments(),
      db.collection("reminderLogs").countDocuments({ status: "sent" }),
      db.collection("reminderLogs").countDocuments({ status: "failed" }),
    ]);

    return {
      total: totalReminders,
      sent: sentReminders,
      failed: failedReminders,
    };
  } catch (error) {
    console.error("Error getting reminder stats:", error);
    return { total: 0, sent: 0, failed: 0 };
  }
}
