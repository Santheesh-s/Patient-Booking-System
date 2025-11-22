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
import { getBrandingSettings, updateBrandingSettings, getPublicBrandingSettings, getNotificationSettings, resetSettings } from "./routes/settings";
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

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Providers API
  app.get("/api/providers", getProviders);
  app.get("/api/providers/:id", getProviderById);
  app.get("/api/providers/:id/availability", getProviderAvailability);
  app.post("/api/providers", authMiddleware, requireRole(["admin"]), createProvider);
  app.patch("/api/providers/:id", authMiddleware, requireRole(["admin"]), updateProvider);
  app.patch("/api/providers/:id/availability", authMiddleware, requireRole(["admin"]), updateProviderAvailability);
  app.delete("/api/providers/:id", authMiddleware, requireRole(["admin"]), deleteProvider);

  // Time Slots API
  app.get("/api/slots", getAvailableSlots);

  // Appointments API
  app.post("/api/appointments", bookAppointment);
  app.get("/api/appointments/:id", getAppointment);
  app.get("/api/appointments/by-email", getAppointmentsByEmail);

  // Admin Appointments API
  app.get("/api/admin/appointments", authMiddleware, requireRole(["admin", "staff", "provider"]), getAppointments);
  app.get("/api/admin/stats", authMiddleware, requireRole(["admin", "staff", "provider"]), getAppointmentStats);
  app.patch("/api/admin/appointments/:appointmentId/status", authMiddleware, requireRole(["admin", "staff", "provider"]), updateAppointmentStatus);
  app.patch("/api/admin/appointments/:appointmentId/reschedule", authMiddleware, requireRole(["admin", "staff", "provider"]), rescheduleAppointment);

  // Notifications API
  app.get("/api/notifications/logs", authMiddleware, requireRole(["admin", "staff"]), getNotificationLogs);
  app.get("/api/notifications/settings", authMiddleware, requireRole(["admin"]), getNotificationSettings);

  // Audit Logs API
  app.get("/api/audit/logs", authMiddleware, requireRole(["admin", "staff"]), getAuditLogs);
  app.get("/api/audit/entity/:entityId", authMiddleware, requireRole(["admin", "staff"]), getEntityAuditTrail);
  app.get("/api/audit/user/:userId", authMiddleware, requireRole(["admin"]), getUserActivityLogs);
  app.get("/api/audit/summary", authMiddleware, requireRole(["admin"]), getAuditSummary);

  // Settings API
  app.get("/api/settings", authMiddleware, requireRole(["admin"]), getBrandingSettings);
  app.patch("/api/settings", authMiddleware, requireRole(["admin"]), updateBrandingSettings);
  app.get("/api/settings/public", getPublicBrandingSettings);
  app.get("/api/settings/notifications", authMiddleware, requireRole(["admin", "staff"]), getNotificationSettings);
  app.post("/api/settings/reset", authMiddleware, requireRole(["admin"]), resetSettings);

  // Calendar Integrations API
  app.get("/api/integrations/calendar", authMiddleware, requireRole(["admin"]), getCalendarIntegrations);
  app.get("/api/integrations/calendar/:type", authMiddleware, requireRole(["admin"]), getCalendarIntegration);
  app.patch("/api/integrations/calendar/:type", authMiddleware, requireRole(["admin"]), updateCalendarIntegration);
  app.delete("/api/integrations/calendar/:type", authMiddleware, requireRole(["admin"]), deleteCalendarIntegration);
  app.post("/api/integrations/calendar/:type/test", authMiddleware, requireRole(["admin"]), testCalendarIntegration);
  app.post("/api/integrations/calendar/:type/sync", authMiddleware, requireRole(["admin"]), syncCalendar);

  // Webhook API
  app.get("/api/webhooks", authMiddleware, requireRole(["admin"]), getWebhooks);
  app.post("/api/webhooks", authMiddleware, requireRole(["admin"]), createWebhook);
  app.patch("/api/webhooks/:id", authMiddleware, requireRole(["admin"]), updateWebhook);
  app.delete("/api/webhooks/:id", authMiddleware, requireRole(["admin"]), deleteWebhook);
  app.post("/api/webhooks/:id/test", authMiddleware, requireRole(["admin"]), testWebhook);

  // Initialize scheduler
  initializeScheduler().catch(console.error);

  return app;
}
