import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { Appointment, BookAppointmentRequest, BookAppointmentResponse } from "@shared/types";
import { ObjectId, Document, WithId } from "mongodb";
import { sendBookingNotifications } from "./notifications";
import {
  validateNotEmpty,
  validateEmail2,
  validatePhone2,
  validateDateRange,
  sendErrorResponse,
  AppError,
  ErrorCode,
  ErrorMessages,
  logError
} from "../errorHandler";

export const bookAppointment: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const appointmentData: BookAppointmentRequest = req.body;

    // Validate required fields
    validateNotEmpty(appointmentData.patientName, "Patient name");
    validateNotEmpty(appointmentData.patientEmail, "Patient email");
    validateNotEmpty(appointmentData.patientPhone, "Patient phone");
    validateNotEmpty(appointmentData.serviceId, "Service ID");
    validateNotEmpty(appointmentData.providerId, "Provider ID");
    validateNotEmpty(appointmentData.startTime, "Start time");
    validateNotEmpty(appointmentData.endTime, "End time");

    // Validate email and phone format
    validateEmail2(appointmentData.patientEmail, "Patient email");
    validatePhone2(appointmentData.patientPhone, "Patient phone");

    // Validate date range
    validateDateRange(appointmentData.startTime, appointmentData.endTime);

    const startTime = new Date(appointmentData.startTime);
    const endTime = new Date(appointmentData.endTime);

    // Prevent double-booking: check if slot is already booked
    const existingBooking = await db.collection("appointments").findOne({
      providerId: appointmentData.providerId,
      status: { $in: ["confirmed", "pending"] },
      $or: [
        {
          startTime: { $lt: endTime.toISOString() },
          endTime: { $gt: startTime.toISOString() },
        },
      ],
    });

    if (existingBooking) {
      throw new AppError(
        ErrorCode.DOUBLE_BOOKING,
        "This time slot is no longer available. Please select another slot.",
        409
      );
    }

    // Create appointment (do not force the Appointment type here so we don't provide a string _id)
    const appointment = {
      ...appointmentData,
      patientEmail: appointmentData.patientEmail.trim(),
      patientEmailLower: appointmentData.patientEmail.toLowerCase().trim(),
      patientEmailNorm: appointmentData.patientEmail.toLowerCase().replace(/\s+/g, "").trim(), // added
      patientName: appointmentData.patientName.trim(),
      patientPhone: appointmentData.patientPhone.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("appointments").insertOne(appointment as any);
    const appointmentId = result.insertedId.toString();

    // Fetch service and provider details for notification
    let serviceDoc, providerDoc;
    try {
      const serviceFilter: any = ObjectId.isValid(appointmentData.serviceId)
        ? { _id: new ObjectId(appointmentData.serviceId) }
        : { _id: appointmentData.serviceId };
      serviceDoc = await db.collection("services").findOne(serviceFilter);
    } catch (err) {
      console.error("Failed to fetch service:", err);
      serviceDoc = null;
    }

    try {
      const providerFilter: any = ObjectId.isValid(appointmentData.providerId)
        ? { _id: new ObjectId(appointmentData.providerId) }
        : { _id: appointmentData.providerId };
      providerDoc = await db.collection("providers").findOne(providerFilter);
    } catch (err) {
      console.error("Failed to fetch provider:", err);
      providerDoc = null;
    }

    // Send notifications asynchronously (don't wait for response)
    const serviceName = serviceDoc?.name || "Appointment";
    const providerName = providerDoc?.name || "Healthcare Provider";
    sendBookingNotifications(appointmentId, appointment, serviceName, providerName).catch(
      (error) => console.error("Error sending notifications:", error)
    );

    res.status(201).json({
      success: true,
      appointmentId,
      message: "Appointment booked successfully. You will receive a confirmation email shortly.",
    } as BookAppointmentResponse);
  } catch (error) {
    logError(error, "bookAppointment");
    if (error instanceof AppError) {
      return sendErrorResponse(res, error);
    }
    res.status(500).json({
      success: false,
      message: "Failed to book appointment",
    } as BookAppointmentResponse);
  }
};

export const getAppointment: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;

    let appointment;
    try {
      const filter: any = ObjectId.isValid(id)
        ? { _id: new ObjectId(id) }
        : { _id: id };
      appointment = await db.collection("appointments").findOne(filter);
    } catch {
      // If something goes wrong, attempt to find by raw id as a fallback
      try {
        appointment = await db.collection("appointments").findOne({ _id: id as any });
      } catch {
        appointment = null;
      }
    }

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json(appointment as Appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({ error: "Failed to fetch appointment" });
  }
};

export const getAppointmentsByEmail: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.json([]);
    }

    const normalized = email.toLowerCase().trim();
    const normalizedNoSpaces = normalized.replace(/\s+/g, "");

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const looseRegex = new RegExp(`^\\s*${escapeRegex(normalized)}\\s*$`, "i");
    const filter = {
      $or: [
        { patientEmailLower: normalized },
        { patientEmailNorm: normalizedNoSpaces },
        { patientEmail: normalized },
        { patientEmail: { $regex: looseRegex } },
      ],
    };

    // Direct find
    let appointments: Document[] = await db
      .collection("appointments")
      .find(filter)
      .sort({ startTime: -1 })
      .toArray();

    // Collation fallback (case-insensitive)
    if (appointments.length === 0) {
      try {
        appointments = await db
          .collection("appointments")
          .find({ patientEmail: normalized })
          .collation({ locale: "en", strength: 2 })
          .sort({ startTime: -1 })
          .toArray();
      } catch {
        // ignore
      }
    }

    // Aggregation fallback (trim + lowercase + remove spaces) — no $replaceAll used
    if (appointments.length === 0) {
      try {
        appointments = await db
          .collection("appointments")
          .aggregate([
            {
              $addFields: {
                _emailNormCalc: {
                  $toLower: {
                    $reduce: {
                      input: { $split: [{ $trim: { input: { $ifNull: ["$patientEmail", ""] } } }, " "] },
                      initialValue: "",
                      in: { $concat: ["$$value", "$$this"] },
                    },
                  },
                },
              },
            },
            { $match: { _emailNormCalc: normalizedNoSpaces } },
            { $sort: { startTime: -1 } },
          ])
          .toArray();
      } catch {
        // ignore
      }
    }

    // Final Node-side normalization filter (guaranteed match even with odd whitespace)
    if (appointments.length === 0) {
      try {
        const candidates = await db
          .collection("appointments")
          .find({ patientEmail: { $regex: escapeRegex(normalized.split("@")[0]), $options: "i" } })
          .limit(500)
          .sort({ startTime: -1 })
          .toArray();

        const norm = (v: any) =>
          String(v ?? "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "");

        appointments = candidates.filter((a: any) => norm(a.patientEmail) === normalizedNoSpaces);
      } catch {
        // ignore
      }
    }

    if (appointments.length === 0) {
      return res.json([]);
    }

    // Collect unique service/provider ids (stringify)
    const serviceIds = Array.from(new Set(
      appointments
        .filter((a: any) => a.serviceId)
        .map((a: any) => (typeof a.serviceId === "object" ? String(a.serviceId) : String(a.serviceId)))
    ));
    const providerIds = Array.from(new Set(
      appointments
        .filter((a: any) => a.providerId)
        .map((a: any) => (typeof a.providerId === "object" ? String(a.providerId) : String(a.providerId)))
    ));

    // Load services
    const serviceIdsForQuery = serviceIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));
    const providerIdsForQuery = providerIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));

    const [serviceDocs, providerDocs] = await Promise.all([
      serviceIds.length
        ? db.collection("services").find({ _id: { $in: serviceIdsForQuery as any[] } }).project({ name: 1 }).toArray()
        : [],
      providerIds.length
        ? db.collection("providers").find({ _id: { $in: providerIdsForQuery as any[] } }).project({ name: 1 }).toArray()
        : [],
    ]);

    const serviceMap = new Map<string, string>();
    for (const s of serviceDocs) serviceMap.set(String(s._id), s.name || "Service");
    const providerMap = new Map<string, string>();
    for (const p of providerDocs) providerMap.set(String(p._id), p.name || "Provider");

    const enriched = appointments.map((a: any) => {
      const sKey = typeof a.serviceId === "object" ? String(a.serviceId) : String(a.serviceId || "");
      const pKey = typeof a.providerId === "object" ? String(a.providerId) : String(a.providerId || "");
      return {
        ...a,
        serviceName: serviceMap.get(sKey) || "Service",
        providerName: providerMap.get(pKey) || "Provider",
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error("getAppointmentsByEmail error:", error);
    return res.json([]);
  }
};