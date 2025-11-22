import { RequestHandler } from "express";
import { getDatabase } from "../db";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

interface NotificationTemplate {
  subject?: string;
  title: string;
  body: string;
  variables: Record<string, string>;
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SmsPayload {
  to: string;
  message: string;
}

// Create SMTP transporter using environment variables
let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter() {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP environment variables not configured");
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return smtpTransporter;
}

// Email/SMS Service Configuration
const NOTIFICATION_CONFIG = {
  email: {
    enabled: true,
    provider: "smtp", // Using SMTP
    from: process.env.SMTP_MAIL || "noreply@clinic.com",
  },
  sms: {
    enabled: true,
    provider: "twilio",
    from: "+1234567890",
  },
};

// Template engine for notifications
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  });

  // Remove conditional blocks with empty values
  // {{#rescheduleReason}}...{{/rescheduleReason}}
  result = result.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, variable, content) => {
    if (variables[variable] && variables[variable].trim()) {
      return content;
    }
    return "";
  });

  return result;
}

// Email Templates
const emailTemplates = {
  bookingConfirmation: {
    subject: "Appointment Confirmation - {{serviceName}}",
    body: `Hello {{patientName}},

Your appointment has been successfully booked!

Service: {{serviceName}}
Provider: {{providerName}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}
Duration: {{duration}} minutes

Confirmation Number: {{appointmentId}}

Important: If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Thank you,
The Clinic Team`,
    html: `<h2>Appointment Confirmation</h2>
<p>Hello <strong>{{patientName}}</strong>,</p>
<p>Your appointment has been successfully booked!</p>
<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{serviceName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Provider</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{providerName}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentDate}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentTime}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Confirmation #</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentId}}</td>
  </tr>
</table>
<p style="color: #666; font-size: 14px;">If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
<p>Thank you,<br>The Clinic Team</p>`,
  },
  bookingPending: {
    subject: "Appointment Pending Approval - {{serviceName}}",
    body: `Hello {{patientName}},

Thank you for booking an appointment with us! Your appointment is pending approval.

Service: {{serviceName}}
Provider: {{providerName}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}

We will confirm your appointment within 24 hours. You will receive an email confirmation once approved.

Thank you,
The Clinic Team`,
    html: `<h2>Appointment Pending Approval</h2>
<p>Hello <strong>{{patientName}}</strong>,</p>
<p>Thank you for booking an appointment! Your appointment is pending approval.</p>
<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{serviceName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Provider</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{providerName}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requested Date</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentDate}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requested Time</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentTime}}</td>
  </tr>
</table>
<p style="color: #666; font-size: 14px;">We will confirm your appointment within 24 hours.</p>
<p>Thank you,<br>The Clinic Team</p>`,
  },
  statusChanged: {
    subject: "Appointment Status Updated - {{serviceName}}",
    body: `Hello {{patientName}},

Your appointment status has been updated.

Service: {{serviceName}}
Status: {{newStatus}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}

If you have any questions, please contact us.

Thank you,
The Clinic Team`,
    html: `<h2>Appointment Status Updated</h2>
<p>Hello <strong>{{patientName}}</strong>,</p>
<p>Your appointment status has been updated to <strong style="color: #0097C2;">{{newStatus}}</strong>.</p>
<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{serviceName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentDate}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentTime}}</td>
  </tr>
</table>
<p>If you have any questions, please contact us.</p>
<p>Thank you,<br>The Clinic Team</p>`,
  },
  appointmentReminder: {
    subject: "Reminder: Your appointment is coming up - {{serviceName}}",
    body: `Hello {{patientName}},

This is a reminder about your upcoming appointment.

Service: {{serviceName}}
Provider: {{providerName}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}

Please arrive 10 minutes early. If you need to cancel or reschedule, please contact us as soon as possible.

Thank you,
The Clinic Team`,
    html: `<h2>Appointment Reminder</h2>
<p>Hello <strong>{{patientName}}</strong>,</p>
<p>This is a reminder about your upcoming appointment.</p>
<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{serviceName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Provider</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{providerName}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentDate}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentTime}}</td>
  </tr>
</table>
<p style="color: #666; font-size: 14px;">Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.</p>
<p>Thank you,<br>The Clinic Team</p>`,
  },
  appointmentRescheduled: {
    subject: "Appointment Rescheduled - {{serviceName}}",
    body: `Hello {{patientName}},

Your appointment has been rescheduled successfully.

Service: {{serviceName}}
Provider: {{providerName}}
New Date: {{appointmentDate}}
New Time: {{appointmentTime}}

Reason for reschedule: {{rescheduleReason}}

If you have any questions, please contact us.

Thank you,
The Clinic Team`,
    html: `<h2>Appointment Rescheduled</h2>
<p>Hello <strong>{{patientName}}</strong>,</p>
<p>Your appointment has been <strong style="color: #0097C2;">rescheduled</strong> successfully.</p>
<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{serviceName}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Provider</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{providerName}}</td>
  </tr>
  <tr style="background-color: #f5f5f5;">
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>New Date</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentDate}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #ddd;"><strong>New Time</strong></td>
    <td style="padding: 10px; border: 1px solid #ddd;">{{appointmentTime}}</td>
  </tr>
</table>
{{#rescheduleReason}}<p style="color: #666; font-size: 14px;"><strong>Reason for reschedule:</strong> {{rescheduleReason}}</p>{{/rescheduleReason}}
<p>If you have any questions, please contact us.</p>
<p>Thank you,<br>The Clinic Team</p>`,
  },
};

// SMS Templates
const smsTemplates = {
  bookingConfirmation: `Hello {{patientName}}, your appointment for {{serviceName}} is confirmed on {{appointmentDate}} at {{appointmentTime}} with {{providerName}}. Confirmation #: {{appointmentId}}. Reply HELP for support.`,
  bookingPending: `Hello {{patientName}}, thank you for booking! Your appointment is pending approval. We'll confirm within 24 hours. Service: {{serviceName}} on {{appointmentDate}}.`,
  appointmentReminder: `Reminder: {{serviceName}} appointment tomorrow at {{appointmentTime}} with {{providerName}}. Please arrive 10 minutes early. Reply HELP for support.`,
  statusChanged: `Your {{serviceName}} appointment on {{appointmentDate}} at {{appointmentTime}} status: {{newStatus}}. Contact us with questions.`,
  appointmentRescheduled: `Your {{serviceName}} appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}} with {{providerName}}. Thank you!`,
};

// Send email via SMTP
async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const transporter = getSmtpTransporter();

    if (!transporter) {
      console.warn("SMTP transporter not configured, logging email instead:", {
        to: payload.to,
        subject: payload.subject,
        preview: payload.body.substring(0, 100) + "...",
      });
      return true;
    }

    const mailOptions = {
      from: NOTIFICATION_CONFIG.email.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.body,
      html: payload.html || payload.body,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", {
      to: payload.to,
      subject: payload.subject,
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Mock SMS sender (replace with actual provider)
async function sendSms(payload: SmsPayload): Promise<boolean> {
  try {
    // In production, integrate with Twilio or similar
    console.log("📱 SMS would be sent:", {
      to: payload.to,
      message: payload.message,
    });

    // Simulate API call
    // const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Basic ${Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
    //     "Content-Type": "application/x-www-form-urlencoded",
    //   },
    //   body: new URLSearchParams({
    //     To: payload.to,
    //     From: NOTIFICATION_CONFIG.sms.from,
    //     Body: payload.message,
    //   }).toString(),
    // });

    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

// Save notification log to database
async function logNotification(
  appointmentId: string,
  type: string,
  channel: "email" | "sms",
  recipientEmail: string,
  recipientPhone: string,
  status: "sent" | "failed" | "pending"
) {
  try {
    const db = await getDatabase();
    await db.collection("notificationLogs").insertOne({
      appointmentId: new ObjectId(appointmentId),
      type,
      channel,
      recipientEmail,
      recipientPhone,
      status,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}

// Send notification for appointment booking
export async function sendBookingNotifications(
  appointmentId: string,
  appointmentData: any,
  serviceName: string,
  providerName: string
) {
  try {
    const variables = {
      patientName: appointmentData.patientName,
      serviceName,
      providerName,
      appointmentDate: new Date(appointmentData.startTime).toLocaleDateString(),
      appointmentTime: new Date(appointmentData.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      appointmentId,
      duration: "30",
    };

    const templateKey =
      appointmentData.status === "pending" ? "bookingPending" : "bookingConfirmation";
    const emailTemplate = (emailTemplates as any)[templateKey];
    const smsTemplate = (smsTemplates as any)[templateKey];

    if (NOTIFICATION_CONFIG.email.enabled && emailTemplate) {
      const emailBody = interpolateTemplate(emailTemplate.body, variables);
      const emailHtml = interpolateTemplate(emailTemplate.html || emailTemplate.body, variables);
      const subject = interpolateTemplate(emailTemplate.subject, variables);

      const emailSent = await sendEmail({
        to: appointmentData.patientEmail,
        subject,
        body: emailBody,
        html: emailHtml,
      });

      await logNotification(
        appointmentId,
        templateKey,
        "email",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        emailSent ? "sent" : "failed"
      );
    }

    if (NOTIFICATION_CONFIG.sms.enabled && smsTemplate) {
      const smsMessage = interpolateTemplate(smsTemplate, variables);
      const smsSent = await sendSms({
        to: appointmentData.patientPhone,
        message: smsMessage,
      });

      await logNotification(
        appointmentId,
        templateKey,
        "sms",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        smsSent ? "sent" : "failed"
      );
    }
  } catch (error) {
    console.error("Error sending booking notifications:", error);
  }
}

// Send notification for status changes
export async function sendStatusChangeNotification(
  appointmentId: string,
  appointmentData: any,
  serviceName: string,
  newStatus: string
) {
  try {
    const variables = {
      patientName: appointmentData.patientName,
      serviceName,
      newStatus: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      appointmentDate: new Date(appointmentData.startTime).toLocaleDateString(),
      appointmentTime: new Date(appointmentData.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const emailTemplate = emailTemplates.statusChanged;
    const smsTemplate = smsTemplates.statusChanged;

    if (NOTIFICATION_CONFIG.email.enabled) {
      const emailBody = interpolateTemplate(emailTemplate.body, variables);
      const emailHtml = interpolateTemplate(emailTemplate.html || emailTemplate.body, variables);
      const subject = interpolateTemplate(emailTemplate.subject, variables);

      const emailSent = await sendEmail({
        to: appointmentData.patientEmail,
        subject,
        body: emailBody,
        html: emailHtml,
      });

      await logNotification(
        appointmentId,
        "statusChanged",
        "email",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        emailSent ? "sent" : "failed"
      );
    }

    if (NOTIFICATION_CONFIG.sms.enabled) {
      const smsMessage = interpolateTemplate(smsTemplate, variables);
      const smsSent = await sendSms({
        to: appointmentData.patientPhone,
        message: smsMessage,
      });

      await logNotification(
        appointmentId,
        "statusChanged",
        "sms",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        smsSent ? "sent" : "failed"
      );
    }
  } catch (error) {
    console.error("Error sending status change notification:", error);
  }
}

// Send notification for appointment reschedule
export async function sendRescheduleNotification(
  appointmentId: string,
  appointmentData: any,
  serviceName: string,
  providerName: string,
  rescheduleReason?: string
) {
  try {
    const variables = {
      patientName: appointmentData.patientName,
      serviceName,
      providerName,
      appointmentDate: new Date(appointmentData.startTime).toLocaleDateString(),
      appointmentTime: new Date(appointmentData.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      rescheduleReason: rescheduleReason || "",
    };

    const emailTemplate = (emailTemplates as any).appointmentRescheduled;
    const smsTemplate = (smsTemplates as any).appointmentRescheduled;

    if (NOTIFICATION_CONFIG.email.enabled && emailTemplate) {
      const emailBody = interpolateTemplate(emailTemplate.body, variables);
      const emailHtml = interpolateTemplate(emailTemplate.html || emailTemplate.body, variables);
      const subject = interpolateTemplate(emailTemplate.subject, variables);

      const emailSent = await sendEmail({
        to: appointmentData.patientEmail,
        subject,
        body: emailBody,
        html: emailHtml,
      });

      await logNotification(
        appointmentId,
        "appointmentRescheduled",
        "email",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        emailSent ? "sent" : "failed"
      );
    }

    if (NOTIFICATION_CONFIG.sms.enabled && smsTemplate) {
      const smsMessage = interpolateTemplate(smsTemplate, variables);
      const smsSent = await sendSms({
        to: appointmentData.patientPhone,
        message: smsMessage,
      });

      await logNotification(
        appointmentId,
        "appointmentRescheduled",
        "sms",
        appointmentData.patientEmail,
        appointmentData.patientPhone,
        smsSent ? "sent" : "failed"
      );
    }
  } catch (error) {
    console.error("Error sending reschedule notification:", error);
  }
}

// Get notification logs handler
export const getNotificationLogs: RequestHandler = async (req, res) => {
  try {
    const db = await getDatabase();
    const { appointmentId } = req.query;

    const filter = appointmentId
      ? { appointmentId: new ObjectId(appointmentId as string) }
      : {};

    const logs = await db
      .collection("notificationLogs")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(logs);
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    res.status(500).json({ error: "Failed to fetch notification logs" });
  }
};

// Get notification settings handler
export const getNotificationSettings: RequestHandler = async (req, res) => {
  try {
    res.json(NOTIFICATION_CONFIG);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
};
