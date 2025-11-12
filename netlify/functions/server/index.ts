import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeScheduler } from "./scheduler";
import { handleDemo } from "./routes/demo";
import { getServices, getServiceById, createService, updateService, deleteService } from "./routes/services";
import { getProviders, getProviderById, createProvider, updateProvider, deleteProvider, getProviderAvailability, updateProviderAvailability } from "./routes/providers";
import { getAvailableSlots } from "./routes/slots";
import { bookAppointment, getAppointment, getAppointmentsByEmail } from "./routes/appointments";
import { login, register, me } from "./routes/auth";
import { initializeDatabase } from "./routes/init";
import { getAppointments, getAppointmentStats, updateAppointmentStatus, rescheduleAppointment } from "./routes/admin";
import { getNotificationLogs, getNotificationSettings } from "./routes/notifications";
import { getAuditLogs, getEntityAuditTrail, getUserActivityLogs, getAuditSummary } from "./routes/audit";
import {
  getCalendarIntegrations,
  getCalendarIntegration,
  updateCalendarIntegration,
  deleteCalendarIntegration,
  testCalendarIntegration,
  syncCalendar,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from "./routes/integrations";
import { authMiddleware, requireRole } from "./auth";
// Add imports to fetch updated appointment context
import { getDatabase } from "./db";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

export function createServer() {
  const app = express();

  // NOTE: Home button navigation is handled on the client via useNavigate("/").
  // No server-side changes are required for Home button routing.

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Email helper (SMTP via nodemailer; no-op if not configured)
  async function sendEmail(to: string, subject: string, html: string) {
    try {
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_MAIL;
      const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
      const pass = rawPass ? rawPass.replace(/\s+/g, "") : undefined;
      if (!user || !pass) {
        console.warn("Email not sent: SMTP not configured");
        return;
      }
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: `"Clinic" <${user}>`,
        to,
        subject,
        html,
      });
    } catch (e: any) {
      console.warn("Email send failed:", e?.message || e);
    }
  }

  // OTP store (in-memory)
  const otpStore = new Map<string, { otp: string; expiresAt: number; userId: string }>();
  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Initialization endpoint (for demo purposes)
  app.get("/api/init", initializeDatabase);

  // Auth API
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/me", authMiddleware, me);

  // Services API
  app.get("/api/services", getServices);
  app.get("/api/services/:id", getServiceById);
  app.post("/api/services", authMiddleware, requireRole(["admin"]), createService);
  app.patch("/api/services/:id", authMiddleware, requireRole(["admin", "provider"]), updateService);
  app.delete("/api/services/:id", authMiddleware, requireRole(["admin", "provider"]), deleteService);

  // Providers API (read/update/delete unchanged)
  app.get("/api/providers", getProviders);
  app.get("/api/providers/:id", getProviderById);
  app.get("/api/providers/:id/availability", getProviderAvailability);
  app.patch("/api/providers/:id", authMiddleware, requireRole(["admin"]), updateProvider);
  app.patch("/api/providers/:id/availability", authMiddleware, requireRole(["admin"]), updateProviderAvailability);
  app.delete("/api/providers/:id", authMiddleware, requireRole(["admin"]), deleteProvider);

  // Allow providers to map services for self
  app.patch("/api/providers/:id/services/self", authMiddleware, requireRole(["provider"]), async (req: any, res) => {
    try {
      const providerId = req.params.id;
      const user = req.user || {};
      if (user.role !== "provider" || !user.providerId || user.providerId !== providerId) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const serviceIds: string[] = Array.isArray(req.body?.services) ? req.body.services : [];
      if (!serviceIds.length) {
        return res.status(400).json({ success: false, error: "Provide services as an array of IDs" });
      }

      // Optional: validate service IDs exist
      const db = await getDatabase();
      const validIds = new Set(
        (await db
          .collection("services")
          .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
          .project({ _id: 1 })
          .toArray()
        ).map((s: any) => String(s._id))
      );
      const filtered = serviceIds.filter((id) => validIds.has(id));

      await db.collection("providers").updateOne(
        { _id: new ObjectId(providerId) },
        { $set: { services: filtered } }
      );

      return res.json({ success: true, message: "Services updated", services: filtered });
    } catch (e: any) {
      console.error("Provider self-assign services error:", e?.message || e);
      return res.status(500).json({ success: false, error: "Failed to update services" });
    }
  });

  // Provider creation (admin) with credential provisioning
  app.post("/api/providers", authMiddleware, requireRole(["admin"]), async (req, res) => {
    const plainPassword: string = req.body.password || Math.random().toString(36).slice(-10);

    // Patch res.json to append generatedPassword for admin visibility
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body && typeof body === "object" && !body.generatedPassword) {
        body.generatedPassword = plainPassword;
      }
      return originalJson(body);
    };

    try {
      await (createProvider as any)(req, res);
    } catch {
      return; // original handler sent error response
    }

    // Post-create: create linked provider user + notify (only if provider doc exists)
    try {
      const { email, name, phone } = req.body || {};
      if (!email) return;

      const { hashPassword } = await import("./auth");
      const db = await getDatabase();
      const providerDoc = await db.collection("providers").findOne({ email });
      const providerId = providerDoc?._id ? String(providerDoc._id) : undefined;

      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            email,
            role: "provider",
            providerId,
            password: hashPassword(plainPassword),
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      const appUrl = process.env.APP_BASE_URL || "http://localhost:8080";
      const html = `
        <h2>Welcome to the Clinic Portal</h2>
        <p>Hello ${name || "Provider"}, your provider account has been created.</p>
        <p><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${plainPassword}</p>
        <p>Login: <a href="${appUrl}/admin/login">${appUrl}/admin/login</a></p>
      `;
      await sendEmail(email, "Your Provider Account Credentials", html);

      if (phone) {
        try {
          await (app.locals as any).sendSMS(
            phone,
            `Provider account created. Email: ${email} Password: ${plainPassword} Login: ${appUrl}/admin/login`
          );
        } catch {}
      }
    } catch (e: any) {
      console.warn("Provider credential provisioning failed:", e?.message || e);
    }
  });

  // Time Slots API
  app.get("/api/slots", getAvailableSlots);

  // Appointments API
  app.post("/api/appointments", bookAppointment);

  // MOVE by-email ABOVE :id TO PREVENT PARAM CAPTURE
  app.get("/api/appointments/by-email", getAppointmentsByEmail);

  // Optional alias using path param (also supports encoded '@')
  app.get("/api/appointments/email/:email", (req, res, next) => {
    req.query.email = req.params.email;
    return getAppointmentsByEmail(req, res, next);
  });

  app.get("/api/appointments/:id", getAppointment);

  // Admin Appointments API
  // Replace direct handlers with wrappers that send SMS after success
  app.get("/api/admin/appointments", authMiddleware, requireRole(["admin", "staff", "provider"]), getAppointments);
  app.get("/api/admin/stats", authMiddleware, requireRole(["admin", "staff", "provider"]), getAppointmentStats);

  app.patch(
    "/api/admin/appointments/:appointmentId/status",
    authMiddleware,
    requireRole(["admin", "staff", "provider"]),
    async (req, res) => {
      try {
        await (updateAppointmentStatus as any)(req, res);
      } finally {
        // Fire SMS after response is produced by the original handler
        try {
          const ctx = await fetchAppointmentContext(req.params.appointmentId);
          if (ctx?.appointment?.patientPhone) {
            await (app.locals as any).sendSMS(ctx.appointment.patientPhone, buildStatusMessage(ctx));
          }
        } catch (e) {
          console.warn("SMS (status update) failed:", (e as Error).message);
        }
      }
    },
  );

  app.patch(
    "/api/admin/appointments/:appointmentId/reschedule",
    authMiddleware,
    requireRole(["admin", "staff", "provider"]),
    async (req, res) => {
      try {
        await (rescheduleAppointment as any)(req, res);
      } finally {
        // Fire SMS after response is produced by the original handler
        try {
          const ctx = await fetchAppointmentContext(req.params.appointmentId);
          if (ctx?.appointment?.patientPhone) {
            await (app.locals as any).sendSMS(ctx.appointment.patientPhone, buildRescheduleMessage(ctx));
          }
        } catch (e) {
            console.warn("SMS (reschedule) failed:", (e as Error).message);
        }
      }
    },
  );

  // Notifications API
  app.get("/api/notifications/logs", authMiddleware, requireRole(["admin", "staff"]), getNotificationLogs);
  app.get("/api/notifications/settings", authMiddleware, requireRole(["admin"]), getNotificationSettings);

  // Settings defaults and helpers
  const defaultSettings = {
    clinicName: "Your Clinic",
    clinicEmail: "contact@clinic.com",
    clinicPhone: "+1 (555) 123-4567",
    clinicAddress: "123 Main Street, City",
    clinicWebsite: "https://example.com",
    clinicLogo: "",
    primaryColor: "#1e293b",
    secondaryColor: "#64748b",
    accentColor: "#0ea5e9",
    fontFamily: "system-ui, -apple-system, sans-serif",
    timezone: "Asia/Kolkata",
    bookingApprovalRequired: false,
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    reminderHoursBefore: 24,
    businessHoursStart: "09:00",
    businessHoursEnd: "17:00",
    updatedAt: new Date().toISOString(),
  };

  function sanitizeSettings(payload: any) {
    const s = { ...(payload || {}) };
    delete (s as any)._id; // important: never try to $set _id
    // coerce safe types
    if (typeof s.reminderHoursBefore !== "number") s.reminderHoursBefore = parseInt(s.reminderHoursBefore ?? 24) || 24;
    if (typeof s.notificationsEnabled !== "boolean") s.notificationsEnabled = !!s.notificationsEnabled;
    if (typeof s.emailNotificationsEnabled !== "boolean") s.emailNotificationsEnabled = !!s.emailNotificationsEnabled;
    if (typeof s.smsNotificationsEnabled !== "boolean") s.smsNotificationsEnabled = !!s.smsNotificationsEnabled;
    if (typeof s.bookingApprovalRequired !== "boolean") s.bookingApprovalRequired = !!s.bookingApprovalRequired;
    s.updatedAt = new Date().toISOString();
    return s;
  }

  async function readSettings() {
    const db = await getDatabase();
    const doc = await db.collection("settings").findOne({});
    return doc || { ...defaultSettings };
  }

  // Settings API (branding) - inline implementation
  app.get("/api/settings/branding", authMiddleware, requireRole(["admin"]), async (_req, res) => {
    try {
      const settings = await readSettings();
      res.json(settings);
    } catch (e) {
      console.error("GET /api/settings/branding failed:", e);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.patch("/api/settings/branding", authMiddleware, requireRole(["admin"]), async (req, res) => {
    try {
      const db = await getDatabase();
      const clean = sanitizeSettings(req.body);
      await db.collection("settings").updateOne({}, { $set: clean }, { upsert: true });
      const updated = await readSettings();
      res.json(updated);
    } catch (e) {
      console.error("PATCH /api/settings/branding failed:", e);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Aliases for compatibility
  app.get("/api/settings", authMiddleware, requireRole(["admin"]), async (_req, res) => {
    try {
      res.json(await readSettings());
    } catch (e) {
      console.error("GET /api/settings failed:", e);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.patch("/api/settings", authMiddleware, requireRole(["admin"]), async (req, res) => {
    try {
      const db = await getDatabase();
      const clean = sanitizeSettings(req.body);
      await db.collection("settings").updateOne({}, { $set: clean }, { upsert: true });
      res.json(await readSettings());
    } catch (e) {
      console.error("PATCH /api/settings failed:", e);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/settings/reset", authMiddleware, requireRole(["admin"]), async (_req, res) => {
    try {
      const db = await getDatabase();
      const resetDoc = { ...defaultSettings, updatedAt: new Date().toISOString() };
      await db.collection("settings").replaceOne({}, resetDoc, { upsert: true });
      res.json(resetDoc);
    } catch (e) {
      console.error("POST /api/settings/reset failed:", e);
      res.status(500).json({ error: "Failed to reset settings" });
    }
  });

  // Public branding (no auth) - expose minimal safe fields
  app.get("/api/public/settings/branding", async (_req, res) => {
    try {
      const s: any = await readSettings();
      res.json({
        clinicName: s.clinicName,
        clinicLogo: s.clinicLogo,
        primaryColor: s.primaryColor,
        secondaryColor: s.secondaryColor,
        accentColor: s.accentColor,
        fontFamily: s.fontFamily,
        timezone: s.timezone, // added
      });
    } catch (e) {
      console.error("GET /api/public/settings/branding failed:", e);
      res.json({
        clinicName: defaultSettings.clinicName,
        clinicLogo: defaultSettings.clinicLogo,
        primaryColor: defaultSettings.primaryColor,
        secondaryColor: defaultSettings.secondaryColor,
        accentColor: defaultSettings.accentColor,
        fontFamily: defaultSettings.fontFamily,
        timezone: defaultSettings.timezone, // added
      });
    }
  });

  // --- SMS sender (Twilio REST API; no extra dependency) ---
  async function formatToE164(raw: string) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (s.startsWith("+")) {
      // Basic sanity check: + and digits only
      return /^\+\d{6,15}$/.test(s) ? s : null;
    }
    const country = (process.env.TWILIO_DEFAULT_COUNTRY || "").trim();
    if (!country || !country.startsWith("+")) return null;
    const digits = s.replace(/\D/g, "").replace(/^0+/, ""); // drop leading zeros
    if (!digits) return null;
    return `${country}${digits}`;
  }

  async function sendSMSViaTwilio(to: string, body: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!sid || !token) {
      throw new Error("Twilio configuration missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
    }
    if (!messagingServiceSid && !from) {
      throw new Error("Twilio sender missing: set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    const params = new URLSearchParams({ To: to, Body: body });
    if (messagingServiceSid) {
      params.append("MessagingServiceSid", messagingServiceSid);
    } else {
      params.append("From", from!);
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const text = await resp.text();
    let json: any = undefined;
    try { json = JSON.parse(text); } catch { /* non-json */ }

    if (!resp.ok) {
      const errMsg = json?.message || text || "Unknown Twilio error";
      const errCode = json?.code ? ` (${json.code})` : "";
      throw new Error(`Twilio API error ${resp.status}${errCode}: ${errMsg}`);
    }
    return json || {};
  }

  // Helper: fetch appointment + provider/service names after update
  async function fetchAppointmentContext(appointmentId: string) {
    try {
      const db = await getDatabase();
      const _id = new ObjectId(appointmentId);
      const appointment = await db.collection("appointments").findOne({ _id });
      if (!appointment) return null;
      const [provider, service] = await Promise.all([
        appointment.providerId
          ? db.collection("providers").findOne({ _id: new ObjectId(appointment.providerId) })
          : null,
        appointment.serviceId
          ? db.collection("services").findOne({ _id: new ObjectId(appointment.serviceId) })
          : null,
      ]);
      return {
        appointment,
        providerName: provider?.name || "Provider",
        serviceName: service?.name || "Appointment",
      };
    } catch {
      return null;
    }
  }

  // Helper: message builders
  function buildStatusMessage(ctx: { appointment: any; providerName: string; serviceName: string }) {
    const dateStr = ctx.appointment?.startTime
      ? new Date(ctx.appointment.startTime).toLocaleString()
      : "";
    const status = String(ctx.appointment?.status || "updated").replace(/^\w/, (c: string) => c.toUpperCase());
    return `Your ${ctx.serviceName} appointment on ${dateStr} with ${ctx.providerName} status: ${status}. Contact us with any questions.`;
  }

  function buildRescheduleMessage(ctx: { appointment: any; providerName: string; serviceName: string }) {
    const dateStr = ctx.appointment?.startTime
      ? new Date(ctx.appointment.startTime).toLocaleString()
      : "";
    return `Your ${ctx.serviceName} appointment has been rescheduled to ${dateStr} with ${ctx.providerName}. Thank you!`;
  }

  // Shared handler to allow conditional middleware wiring
  const smsHandler: express.RequestHandler = async (req, res) => {
    try {
      // accept JSON body, form body, or query params
      const rawTo =
        (req.body && (req.body.to ?? req.body.To)) ?? (req.query && ((req.query.to as string) ?? (req.query.To as string)));
      const rawMessage =
        (req.body && ((req.body.message ?? req.body.body ?? req.body.Body))) ??
        (req.query && ((req.query.message as string) ?? (req.query.body as string) ?? (req.query.Body as string)));

      const to = typeof rawTo === "string" ? rawTo : "";
      const message = typeof rawMessage === "string" ? rawMessage : "";

      if (!to || !message) {
        return res.status(400).json({ success: false, error: "Missing 'to' or 'message'" });
      }

      const e164 = await formatToE164(to);
      if (!e164) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid phone number. Provide E.164 (+<country><number>) or set TWILIO_DEFAULT_COUNTRY, e.g. +1 or +91.",
        });
      }

      const result = await sendSMSViaTwilio(e164, message);
      return res.json({ success: true, sid: result?.sid, to: e164, status: result?.status });
    } catch (err: any) {
      console.error("SMS send failed:", err?.message || err);
      return res.status(502).json({ success: false, error: err?.message || "Failed to send SMS" });
    }
  };

  // Expose SMS helper for internal usage (replace any "📱 SMS would be sent" logs with this)
  (app.locals as any).sendSMS = async (to: string, message: string) => {
    const e164 = await formatToE164(to);
    if (!e164) throw new Error("Invalid phone number; set TWILIO_DEFAULT_COUNTRY for local numbers");
    // normalize message: collapse CR/LF and extra spaces
    const normalized = String(message).replace(/\r?\n+/g, " ").replace(/\s\s+/g, " ").trim();
    return sendSMSViaTwilio(e164, normalized);
  };

  // Conditionally expose SMS endpoint publicly for testing
  if (process.env.SMS_PUBLIC === "true") {
    app.post("/api/notifications/sms", smsHandler);
    app.get("/api/notifications/sms/test", smsHandler);
  } else {
    app.post("/api/notifications/sms", authMiddleware, requireRole(["admin", "staff", "provider"]), smsHandler);
  }
  // --- end SMS sender ---

  // ========== Forgot Password ==========
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ success: false, error: "Email is required" });

      const db = await getDatabase();
      const user = await db.collection("users").findOne({ email });
      if (!user) {
        // Don't reveal existence; respond success
        return res.json({ success: true, message: "If the email exists, an OTP has been sent" });
      }

      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      otpStore.set(email, { otp, expiresAt, userId: String(user._id) });

      const appUrl = process.env.APP_BASE_URL || "http://localhost:8080";
      const html = `
        <h2>Password Reset OTP</h2>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p><a href="${appUrl}/reset-password">Reset Password</a></p>
      `;
      await sendEmail(email, "Password Reset OTP", html);

      // Optional SMS if a patient phone exists and SMS_PUBLIC true
      if (process.env.SMS_PUBLIC === "true" && (user as any).phone) {
        try {
          await (app.locals as any).sendSMS((user as any).phone, `Your password reset OTP is ${otp}. It expires in 10 minutes.`);
        } catch {}
      }

      res.json({ success: true, message: "If the email exists, an OTP has been sent" });
    } catch (e: any) {
      console.error("Forgot password error:", e?.message || e);
      res.status(500).json({ success: false, error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body || {};
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, error: "Email, otp and newPassword are required" });
      }

      const data = otpStore.get(email);
      if (!data || Date.now() > data.expiresAt || data.otp !== otp) {
        return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
      }

      const db = await getDatabase();
      // hashPassword is exported from ./auth in this codebase
      const { hashPassword } = await import("./auth");
      await db.collection("users").updateOne(
        { _id: new ObjectId(data.userId) },
        { $set: { password: hashPassword(newPassword) } }
      );

      otpStore.delete(email);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (e: any) {
      console.error("Reset password error:", e?.message || e);
      res.status(500).json({ success: false, error: "Failed to reset password" });
    }
  });
  // ========== End Forgot Password ==========

  // JSON parse error handler (returns clean 400 instead of HTML overlay)
  // Must be after app.use(express.json()) and before final handlers

  // 404 for unknown API routes (no "*" usage; compatible with Express 4/5)
  app.use("/api", (_req, res) => {
    return res.status(404).json({ error: "Not Found" });
  });

  initializeScheduler().catch(console.error);

  return app;
}