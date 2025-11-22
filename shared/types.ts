export interface Service {
  _id?: string;
  name: string;
  description: string;
  duration: number; // in minutes
  providers: string[]; // provider IDs
  customFields: CustomField[];
}

export interface Provider {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  speciality: string;
  services: string[]; // service IDs
}

export interface BusinessHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isOpen: boolean;
}

export interface ProviderAvailability {
  _id?: string;
  providerId: string;
  businessHours: BusinessHours[];
  blockedDates: string[]; // ISO date strings for holidays/vacation
}

export interface CustomField {
  _id?: string;
  name: string;
  type: "text" | "email" | "phone" | "textarea" | "checkbox" | "select";
  required: boolean;
  order: number;
  options?: string[]; // for select type
}

export interface TimeSlot {
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  isAvailable: boolean;
}

export interface Appointment {
  _id?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  providerId: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  customFieldValues: Record<string, string>;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id?: string;
  email: string;
  password: string; // hashed
  role: "admin" | "provider" | "staff";
  providerId?: string; // for provider role
  createdAt?: string;
}

export type GetServicesResponse = Service[];
export type GetProvidersResponse = Provider[];
export type GetAvailableSlotsResponse = TimeSlot[];
export type BookAppointmentRequest = Omit<Appointment, "_id" | "status" | "createdAt" | "updatedAt">;
export type BookAppointmentResponse = { success: boolean; appointmentId?: string; message: string };
