import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { Appointment, BookAppointmentRequest, BookAppointmentResponse } from "@shared/types";
import { ObjectId } from "mongodb";
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

    // Create appointment
    const appointment: Appointment = {
      ...appointmentData,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("appointments").insertOne(appointment);
    const appointmentId = result.insertedId.toString();

    // Fetch service and provider details for notification
    let serviceDoc, providerDoc;
    try {
      serviceDoc = await db.collection("services").findOne({
        _id: new ObjectId(appointmentData.serviceId),
      });
    } catch {
      // If not a valid ObjectId, try as string
      serviceDoc = await db.collection("services").findOne({
        _id: appointmentData.serviceId,
      });
    }

    try {
      providerDoc = await db.collection("providers").findOne({
        _id: new ObjectId(appointmentData.providerId),
      });
    } catch {
      // If not a valid ObjectId, try as string
      providerDoc = await db.collection("providers").findOne({
        _id: appointmentData.providerId,
      });
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
      appointment = await db.collection("appointments").findOne({
        _id: new ObjectId(id),
      });
    } catch {
      // If not a valid ObjectId, try as string
      appointment = await db.collection("appointments").findOne({
        _id: id,
      });
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

    console.log("getAppointmentsByEmail called with query:", { email });

    if (!email || typeof email !== "string") {
      console.warn("Invalid email parameter");
      return res.status(400).json({ error: "Email parameter is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Fetching appointments for email: ${normalizedEmail}`);

    const appointments = await db
      .collection("appointments")
      .find({ patientEmail: normalizedEmail })
      .sort({ startTime: -1 })
      .toArray();

    console.log(`Found ${appointments.length} appointments for ${normalizedEmail}`);

    if (appointments.length === 0) {
      console.log("No appointments found, returning empty array");
      return res.json([]);
    }

    const servicesMap = new Map();
    const providersMap = new Map();

    for (const apt of appointments) {
      // Fetch service details
      if (apt.serviceId && !servicesMap.has(apt.serviceId)) {
        let service = null;
        try {
          // Try as ObjectId first
          if (typeof apt.serviceId === "object") {
            service = await db.collection("services").findOne({
              _id: apt.serviceId,
            });
          } else {
            try {
              service = await db.collection("services").findOne({
                _id: new ObjectId(apt.serviceId),
              });
            } catch {
              // If ObjectId fails, try as string
              service = await db.collection("services").findOne({
                _id: apt.serviceId,
              });
            }
          }
        } catch (serviceError) {
          console.error(`Failed to fetch service ${apt.serviceId}:`, serviceError);
        }
        servicesMap.set(apt.serviceId, service?.name || "Unknown Service");
      }

      // Fetch provider details
      if (apt.providerId && !providersMap.has(apt.providerId)) {
        let provider = null;
        try {
          // Try as ObjectId first
          if (typeof apt.providerId === "object") {
            provider = await db.collection("providers").findOne({
              _id: apt.providerId,
            });
          } else {
            try {
              provider = await db.collection("providers").findOne({
                _id: new ObjectId(apt.providerId),
              });
            } catch {
              // If ObjectId fails, try as string
              provider = await db.collection("providers").findOne({
                _id: apt.providerId,
              });
            }
          }
        } catch (providerError) {
          console.error(`Failed to fetch provider ${apt.providerId}:`, providerError);
        }
        providersMap.set(apt.providerId, provider?.name || "Unknown Provider");
      }
    }

    const appointmentsWithDetails = appointments.map((apt) => ({
      ...apt,
      serviceName: servicesMap.get(apt.serviceId),
      providerName: providersMap.get(apt.providerId),
    }));

    console.log(`Returning ${appointmentsWithDetails.length} appointments with details`);
    res.json(appointmentsWithDetails);
  } catch (error) {
    console.error("Error fetching appointments by email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Full error stack:", error);
    res.status(500).json({
      error: "Failed to fetch appointments",
      message: errorMessage,
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
};
