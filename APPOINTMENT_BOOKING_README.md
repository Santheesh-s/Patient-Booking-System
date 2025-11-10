# Appointment Booking System

A complete medical appointment booking system built with React, Node.js, Express, and MongoDB. Features a patient-facing booking portal and a comprehensive admin dashboard for managing appointments and schedules.

## 🚀 Features Implemented

### Patient Portal
- ✅ Online appointment booking (24/7)
- ✅ Service selection from available services
- ✅ Provider selection (doctor/staff assignment)
- ✅ Smart time slot selection (8 random available slots per day)
- ✅ Customizable booking form fields (per service)
- ✅ Booking confirmation to patient
- ✅ No online cancellation option (patients must call to cancel)
- ✅ Fully responsive for mobile and desktop
- ✅ Beautiful, modern UI with smooth flow

### Admin & Staff Portal
- ✅ Secure admin login with role-based access control
- ✅ Dashboard with appointment statistics
- ✅ Appointment management (view, change status)
- ✅ Filter appointments by status
- ✅ Real-time appointment count and analytics
- ✅ Staff role support for team management

### Technical Features
- ✅ MongoDB database with proper schema design
- ✅ RESTful API endpoints for all operations
- ✅ Conflict prevention (prevent double-booking)
- ✅ Role-based access control (RBAC)
- ✅ Customizable services and providers
- ✅ Business hours and availability management
- ✅ Responsive UI for all screen sizes
- ✅ Modern color scheme (medical blue/teal)

## 🛠️ Tech Stack

- **Frontend**: React 18 + React Router 6 + TypeScript + Vite
- **Styling**: TailwindCSS 3 + Radix UI
- **Backend**: Express.js + Node.js
- **Database**: MongoDB (Atlas)
- **UI Components**: Lucide Icons + Radix UI primitives

## 📋 Getting Started

### Initial Setup

1. **Initialize Database**
   - Visit `/setup` page
   - Click "Initialize Database"
   - This creates demo services, providers, and admin account

2. **Demo Credentials**
   - Email: `admin@clinic.com`
   - Password: `admin123`

### Usage

#### For Patients
1. Visit home page or `/` route
2. Click "Book Appointment"
3. Select a service
4. Choose a provider
5. Pick a date
6. Select from 8 random available time slots
7. Fill in your details and any custom fields
8. Confirm booking

#### For Admin/Staff
1. Visit `/admin/login`
2. Enter demo credentials
3. View dashboard with statistics
4. Manage appointments:
   - Filter by status (Pending, Confirmed, Completed, Cancelled)
   - Change appointment status
   - View patient details and booking info

## 🗂️ Project Structure

```
client/
├── pages/
│   ├── Index.tsx                 # Welcome/Home page
│   ├── AdminLogin.tsx            # Admin login page
│   ├── AdminDashboard.tsx        # Admin dashboard
│   └── Setup.tsx                 # Database initialization
├── components/
│   ├── BookingForm/
│   │   ├── BookingFormComponent.tsx    # Main booking flow
│   │   ├── ServiceSelector.tsx         # Service selection
│   │   ├── ProviderSelector.tsx        # Provider selection
│   │   └── TimeSlotSelector.tsx        # Time slot selection
│   └── ProtectedRoute.tsx       # Auth-protected routes
└── global.css                   # Theme & tailwind setup

server/
├─�� index.ts                     # Express app setup
├── db.ts                        # MongoDB connection
├── auth.ts                      # Auth middleware & utilities
└── routes/
    ├── services.ts              # Service management API
    ├── providers.ts             # Provider management API
    ├── slots.ts                 # Slot generation algorithm
    ├── appointments.ts          # Patient booking API
    ├── auth.ts                  # Login/register API
    ├── admin.ts                 # Admin dashboard API
    └── init.ts                  # Database initialization

shared/
├── api.ts                       # Shared types
└── types.ts                     # Type definitions
```

## 🔧 API Endpoints

### Public Endpoints

#### Services
- `GET /api/services` - List all services
- `POST /api/services` - Create service (admin only)

#### Providers
- `GET /api/providers` - List providers (filter by serviceId)
- `GET /api/providers/:id` - Get provider details
- `POST /api/providers` - Create provider (admin only)

#### Time Slots
- `GET /api/slots?providerId=X&date=Y&duration=Z` - Get 8 random available slots

#### Appointments
- `POST /api/appointments` - Book appointment
- `GET /api/appointments/:id` - Get appointment details

### Auth Endpoints
- `POST /api/auth/login` - Admin/staff login
- `POST /api/auth/register` - Create admin user
- `GET /api/auth/me` - Get current user (requires auth)

### Admin Endpoints (Protected)
- `GET /api/admin/appointments` - List appointments (with filters)
- `GET /api/admin/stats` - Get dashboard statistics
- `PATCH /api/admin/appointments/:id/status` - Update appointment status
- `PATCH /api/admin/appointments/:id/reschedule` - Reschedule appointment

### Utility
- `GET /api/init` - Initialize database with demo data
- `GET /api/ping` - Health check

## 🎨 Color Scheme

Modern healthcare-themed color palette:
- **Primary**: Bright Medical Blue (#0097C2)
- **Secondary**: Teal/Aqua (#00B4B4)
- **Background**: Clean White
- **Text**: Dark Blue-Gray (#001E3C)
- **Borders**: Light Gray (#E0E7FF)

## 📱 Responsive Design

All pages are fully responsive:
- **Mobile**: 375px (iPhone SE)
- **Tablet**: 768px and up
- **Desktop**: 1024px and up

Uses responsive grid layouts and flexible typography.

## 🔐 Security Features

- Role-based access control (RBAC)
- Protected admin routes
- Password hashing (base64 for demo - use bcrypt in production)
- JWT token authentication
- CORS enabled
- Secure session management

## 🚀 Production Considerations

### Before Going Live

1. **Security**
   - Replace password hashing with bcrypt
   - Use proper JWT secret signing
   - Implement rate limiting
   - Add input validation

2. **Database**
   - Create proper indexes for queries
   - Set up connection pooling
   - Implement backup procedures
   - Enable encryption at rest

3. **Notifications**
   - Implement email confirmations (Nodemailer, SendGrid)
   - Add SMS notifications (Twilio)
   - Send reminder emails 24 hours before

4. **Features**
   - Add calendar drag-and-drop rescheduling
   - Implement service/provider/availability management UI
   - Add patient history view
   - Create audit logs
   - Add analytics dashboard

5. **Deployment**
   - Deploy to Netlify, Vercel, or similar
   - Use environment variables for secrets
   - Set up CI/CD pipeline
   - Monitor error logging (Sentry)

## 📊 Data Schema

### Collections

**Services**
- name, description, duration (minutes)
- providers (array of provider IDs)
- customFields (array of form fields)

**Providers**
- name, email, phone, speciality
- services (array of service IDs)

**Availability**
- providerId
- businessHours (day of week, start/end times)
- blockedDates (holidays, vacation)

**Appointments**
- patientName, patientEmail, patientPhone
- serviceId, providerId
- startTime, endTime
- customFieldValues
- status (pending, confirmed, completed, cancelled)

**Users**
- email, password (hashed)
- role (admin, provider, staff)
- providerId (for provider role)

## 🔄 Booking Flow

1. **Service Selection** - Patient picks service
2. **Provider Selection** - Patient picks provider offering service
3. **Date Selection** - Patient picks date (next 30 days)
4. **Slot Selection** - Show 8 random available slots for that date
5. **Details** - Collect patient info and custom fields
6. **Confirmation** - Show confirmation and send email

## ⚙️ Configuration

### Slot Generation Algorithm

The system displays **8 random available slots** per day:

1. Get provider's business hours for that day
2. Fetch all confirmed/pending appointments
3. Generate all possible slots (30-min intervals by default)
4. Filter out conflicts
5. Shuffle and return first 8

This creates variety and encourages quick booking.

### Business Hours

Set per-provider per-day-of-week:
- Monday-Friday: 9am-5pm
- Saturday-Sunday: Closed

Customizable in admin (future feature).

## 🤝 Integration Points

Ready to integrate with:
- Email services (SendGrid, Mailgun)
- SMS providers (Twilio)
- Calendar systems (Google Calendar, Outlook)
- Billing systems (Stripe, PayPal)
- Electronic Health Records (EHR)
- Customer relationship management (CRM)

## 📝 Notes

- No patient online cancellation (call clinic to cancel)
- Clear messaging about cancellation policy
- Demo credentials are intentionally simple
- All times stored as ISO 8601 strings
- MongoDB document IDs used for referential integrity

## 🐛 Troubleshooting

### No Services Showing
1. Visit `/setup` to initialize database
2. Check MongoDB connection
3. Verify database name is "book"

### Login Not Working
1. Run `/api/init` first to create admin user
2. Use demo credentials: admin@clinic.com / admin123
3. Check auth token in localStorage

### Slots Not Showing
1. Ensure provider has business hours set
2. Check availability collection in MongoDB
3. Verify date is not blocked
4. Make sure slots within 30 days

---

Built with ❤️ for modern clinic scheduling

## Notifications

### Twilio Trial SMS Prefix
- Twilio prepends “Sent from your Twilio trial account” to all SMS sent from trial projects.
- This cannot be removed in code. To remove the prefix:
  1. Upgrade your Twilio project (add a payment method).
  2. Buy/assign an SMS-capable Twilio number or use a Messaging Service SID.
  3. Send to non-verified numbers (trial can only message verified numbers).
- Optional: set `TWILIO_TRIAL_ACCOUNT=true` in `.env` to show a runtime warning during development.
