import { Response } from "express";

export enum ErrorCode {
  // Validation errors
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_PHONE = "INVALID_PHONE",

  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Business logic errors
  SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE",
  DOUBLE_BOOKING = "DOUBLE_BOOKING",
  INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",

  // Server errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Error response formatter
export function sendErrorResponse(res: Response, error: AppError | Error) {
  if (error instanceof AppError) {
    console.error(`[${error.code}] ${error.message}`);
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Generic error handling
  console.error("Unexpected error:", error);
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    },
  });
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

export function validateNotEmpty(value: any, fieldName: string): void {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw new AppError(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `${fieldName} is required`,
      400,
      { field: fieldName }
    );
  }
}

export function validateEmail2(email: string, fieldName: string = "email"): void {
  if (!validateEmail(email)) {
    throw new AppError(
      ErrorCode.INVALID_EMAIL,
      `${fieldName} is not valid`,
      400,
      { field: fieldName }
    );
  }
}

export function validatePhone2(phone: string, fieldName: string = "phone"): void {
  if (!validatePhone(phone)) {
    throw new AppError(
      ErrorCode.INVALID_PHONE,
      `${fieldName} must be a valid phone number`,
      400,
      { field: fieldName }
    );
  }
}

export function validateDateRange(startDate: string, endDate: string): void {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "End time must be after start time",
        400,
        { startTime: startDate, endTime: endDate }
      );
    }

    // Check if times are in the future
    const now = new Date();
    if (start < now) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        "Appointment cannot be scheduled in the past",
        400,
        { startTime: startDate }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      "Invalid date format",
      400,
      { startTime: startDate, endTime: endDate }
    );
  }
}

// Common error messages
export const ErrorMessages = {
  APPOINTMENT_NOT_FOUND: new AppError(
    ErrorCode.NOT_FOUND,
    "Appointment not found",
    404
  ),
  SERVICE_NOT_FOUND: new AppError(
    ErrorCode.NOT_FOUND,
    "Service not found",
    404
  ),
  PROVIDER_NOT_FOUND: new AppError(
    ErrorCode.NOT_FOUND,
    "Provider not found",
    404
  ),
  SLOT_NOT_AVAILABLE: new AppError(
    ErrorCode.SLOT_UNAVAILABLE,
    "This time slot is no longer available. Please select another slot.",
    409
  ),
  DOUBLE_BOOKING: new AppError(
    ErrorCode.DOUBLE_BOOKING,
    "This provider already has an appointment at this time",
    409
  ),
  UNAUTHORIZED_REQUEST: new AppError(
    ErrorCode.UNAUTHORIZED,
    "You are not authorized to perform this action",
    401
  ),
  INVALID_CREDENTIALS: new AppError(
    ErrorCode.INVALID_CREDENTIALS,
    "Invalid email or password",
    401
  ),
  PROVIDER_UNAVAILABLE: new AppError(
    ErrorCode.PROVIDER_UNAVAILABLE,
    "Provider is not available at the requested time",
    409,
    { reason: "Provider is on vacation or has blocked this time" }
  ),
};

// Error logging helper
export function logError(error: any, context: string = "") {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error instanceof Error ? error.message : String(error),
    code: error instanceof AppError ? error.code : "UNKNOWN",
  };

  console.error(`[ERROR] ${JSON.stringify(errorInfo)}`);

  // In production, you might want to send this to a monitoring service like Sentry
  // Example: Sentry.captureException(error, { extra: errorInfo });
}
