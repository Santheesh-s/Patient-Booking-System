import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { Appointment } from "@shared/types";
import { ObjectId } from "mongodb";
import { sendStatusChangeNotification } from "./notifications";
import { logAuditAction, detectChanges } from "./audit";

export const getAppointments: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { status, providerId, startDate, endDate, limit = 50, skip = 0 } = req.query;

    let query: any = {};

    // If provider, only show their appointments
    if (req.user?.role === "provider" && req.user?.providerId) {
      query.providerId = req.user.providerId;
      console.log(`Filtering appointments for provider: ${req.user.providerId}`);
    } else if (providerId) {
      query.providerId = providerId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate as string).toISOString();
      }
    }

    const appointments = await db
      .collection("appointments")
      .find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .toArray();

    const total = await db.collection("appointments").countDocuments(query);

    res.json({
      appointments: appointments as Appointment[],
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
};

export const getAppointmentStats: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();

    // If provider, only show their stats
    const filter = req.user?.role === "provider" && req.user?.providerId
      ? { providerId: req.user.providerId }
      : {};

    const totalAppointments = await db.collection("appointments").countDocuments(filter);
    const pendingAppointments = await db.collection("appointments").countDocuments({ ...filter, status: "pending" });
    const confirmedAppointments = await db.collection("appointments").countDocuments({ ...filter, status: "confirmed" });

    // Get distinct patient emails
    let totalPatients = 0;
    if (Object.keys(filter).length > 0) {
      // If filtering, get distinct from filtered results
      const distinctEmails = await db.collection("appointments").distinct("patientEmail", filter);
      totalPatients = distinctEmails.length;
    } else {
      // If no filter, get all distinct emails
      const distinctEmails = await db.collection("appointments").distinct("patientEmail");
      totalPatients = distinctEmails.length;
    }

    res.json({
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalPatients,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const updateAppointmentStatus: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch appointment before update
    const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(appointmentId) });
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // If provider, ensure they can only modify their own appointments
    if (req.user?.role === "provider" && appointment.providerId !== req.user.providerId) {
      return res.status(403).json({ error: "You can only modify your own appointments" });
    }

    const beforeStatus = appointment.status;

    let updateQuery: any = { status, updatedAt: new Date().toISOString() };
    let result;
    try {
      result = await db.collection("appointments").updateOne(
        { _id: new ObjectId(appointmentId) },
        { $set: updateQuery }
      );
    } catch {
      result = await db.collection("appointments").updateOne(
        { _id: appointmentId },
        { $set: updateQuery }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Fetch service details for notification
    const service = await db.collection("services").findOne({
      _id: new ObjectId(appointment.serviceId),
    });

    const serviceName = service?.name || "Appointment";
    const appointmentTime = new Date(appointment.startTime).toLocaleDateString() +
      " at " +
      new Date(appointment.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    // Log audit action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "updateStatus",
      "appointment",
      appointmentId,
      `${appointment.patientName} - ${serviceName} (${appointmentTime})`,
      detectChanges({ status: beforeStatus }, { status }),
      "success",
      undefined,
      req.ip,
      req.get("User-Agent")
    );

    // Send status change notification
    sendStatusChangeNotification(appointmentId, appointment, serviceName, status).catch(
      (error) => console.error("Error sending status notification:", error)
    );

    res.json({ success: true, message: "Appointment updated" });
  } catch (error) {
    console.error("Error updating appointment:", error);

    // Log failed action
    await logAuditAction(
      req.user?.id,
      req.user?.email,
      "updateStatus",
      "appointment",
      req.params.appointmentId,
      "Unknown",
      {},
      "failure",
      error instanceof Error ? error.message : "Unknown error",
      req.ip,
      req.get("User-Agent")
    );

    res.status(500).json({ error: "Failed to update appointment" });
  }
};

export const rescheduleAppointment: RequestHandler = async (req: any, res) => {
  try {
    const db = await getDatabase();
    const { appointmentId } = req.params;
    const { newStartTime, newEndTime, reason } = req.body;

    // Check for conflicts
    let appointment;
    try {
      appointment = await db.collection("appointments").findOne({ _id: new ObjectId(appointmentId) });
    } catch {
      appointment = await db.collection("appointments").findOne({ _id: appointmentId });
    }

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // If provider, ensure they can only reschedule their own appointments
    if (req.user?.role === "provider" && appointment.providerId !== req.user.providerId) {
      return res.status(403).json({ error: "You can only reschedule your own appointments" });
    }

    const conflict = await db.collection("appointments").findOne({
      _id: { $ne: new ObjectId(appointmentId) },
      providerId: appointment.providerId,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        {
          startTime: { $lt: newEndTime },
          endTime: { $gt: newStartTime },
        },
      ],
    });

    if (conflict) {
      return res.status(409).json({ error: "Time slot conflicts with another appointment" });
    }

    const updateData: any = {
      startTime: newStartTime,
      endTime: newEndTime,
      updatedAt: new Date().toISOString(),
    };

    if (reason) {
      updateData.rescheduleReason = reason;
    }

    let result;
    try {
      result = await db.collection("appointments").updateOne(
        { _id: new ObjectId(appointmentId) },
        { $set: updateData }
      );
    } catch {
      result = await db.collection("appointments").updateOne(
        { _id: appointmentId },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Fetch updated appointment data for notification
    let updatedAppointment;
    try {
      updatedAppointment = await db.collection("appointments").findOne({ _id: new ObjectId(appointmentId) });
    } catch {
      updatedAppointment = await db.collection("appointments").findOne({ _id: appointmentId });
    }

    // Fetch service and provider details for notification
    let serviceDoc, providerDoc;
    try {
      serviceDoc = await db.collection("services").findOne({
        _id: new ObjectId(updatedAppointment.serviceId),
      });
    } catch {
      serviceDoc = await db.collection("services").findOne({
        _id: updatedAppointment.serviceId,
      });
    }

    try {
      providerDoc = await db.collection("providers").findOne({
        _id: new ObjectId(updatedAppointment.providerId),
      });
    } catch {
      providerDoc = await db.collection("providers").findOne({
        _id: updatedAppointment.providerId,
      });
    }

    // Send reschedule notification asynchronously
    const { sendRescheduleNotification } = await import("./notifications");
    const serviceName = serviceDoc?.name || "Appointment";
    const providerName = providerDoc?.name || "Healthcare Provider";

    sendRescheduleNotification(
      appointmentId,
      updatedAppointment,
      serviceName,
      providerName,
      reason
    ).catch((error) => console.error("Error sending reschedule notification:", error));

    res.json({ success: true, message: "Appointment rescheduled successfully" });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.status(500).json({ error: "Failed to reschedule appointment" });
  }
};
