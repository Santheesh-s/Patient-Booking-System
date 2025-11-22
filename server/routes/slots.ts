import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { TimeSlot, Appointment } from "@shared/types";
import { ObjectId } from "mongodb";

// Generate time slots for a provider on a specific date
// Returns 8 random available slots
export const getAvailableSlots: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { providerId, date, duration } = req.query;

    if (!providerId || !date || !duration) {
      return res.status(400).json({ error: "Missing required parameters: providerId, date, duration" });
    }

    const durationMinutes = parseInt(duration as string);
    const selectedDate = new Date(date as string);
    
    // Get provider availability
    const availability = await db.collection("availability").findOne({
      providerId: providerId as string,
    });

    if (!availability) {
      return res.status(404).json({ error: "Provider availability not found" });
    }

    // Get booked appointments for this provider on this date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await db.collection("appointments").find({
      providerId: providerId as string,
      startTime: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString(),
      },
      status: { $in: ["confirmed", "pending"] },
    }).toArray();

    // Get business hours for the day of week
    const dayOfWeek = selectedDate.getDay();
    const businessHours = availability.businessHours.find((bh: any) => bh.dayOfWeek === dayOfWeek);

    if (!businessHours || !businessHours.isOpen) {
      return res.json([]);
    }

    // Check if date is in blocked dates
    const dateString = selectedDate.toISOString().split("T")[0];
    if (availability.blockedDates && availability.blockedDates.includes(dateString)) {
      return res.json([]);
    }

    // Generate all possible slots
    const allSlots: TimeSlot[] = [];
    const [startHour, startMin] = businessHours.startTime.split(":").map(Number);
    const [endHour, endMin] = businessHours.endTime.split(":").map(Number);

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(startHour, startMin, 0, 0);
    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    let currentSlot = new Date(startDateTime);
    while (currentSlot.getTime() + durationMinutes * 60000 <= endDateTime.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + durationMinutes * 60000);
      
      // Check if slot conflicts with booked appointments
      const isConflict = bookedAppointments.some((apt: any) => {
        const aptStart = new Date(apt.startTime).getTime();
        const aptEnd = new Date(apt.endTime).getTime();
        const slotStart = currentSlot.getTime();
        const slotEndTime = slotEnd.getTime();
        return slotStart < aptEnd && slotEndTime > aptStart;
      });

      if (!isConflict) {
        allSlots.push({
          startTime: currentSlot.toISOString(),
          endTime: slotEnd.toISOString(),
          isAvailable: true,
        });
      }

      currentSlot = new Date(currentSlot.getTime() + durationMinutes * 60000);
    }

    // Shuffle and return 8 random slots (or fewer if not enough available)
    const shuffled = allSlots.sort(() => Math.random() - 0.5);
    const selectedSlots = shuffled.slice(0, 8);

    res.json(selectedSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Failed to fetch available slots" });
  }
};
