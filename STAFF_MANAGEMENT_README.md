# Staff Management System

## Overview

The Staff Management System is a comprehensive CRUD (Create, Read, Update, Delete) feature that allows hotel owners and administrators to manage staff members, their roles, permissions, and track their activities.

## Features

### 🔐 **Complete CRUD Operations**
- **Create**: Add new staff members with detailed information
- **Read**: View staff list with filtering and search capabilities
- **Update**: Edit staff information and permissions
- **Delete**: Remove staff members from the system

### 📧 **Email Integration**
- Automatic invitation emails sent to new staff members
- Includes login credentials and role information
- Professional HTML email templates
- Password security with temporary passwords

### 👥 **Role-Based Access Control**
- Multiple staff roles: Admin, Front Office Staff, Housekeeping Manager, Housekeeping Staff
- Granular permissions system
- Department-based organization
- Status management (Active/Inactive)

### 📊 **Dashboard & Analytics**
- Real-time staff statistics
- Activity logs tracking
- Online staff monitoring
- Performance metrics

### 🔍 **Advanced Filtering & Search**
- Search by name or email
- Filter by role and status
- Sort by various criteria
- Pagination support

## Database Schema

### Staff Table
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    join_date DATE DEFAULT CURRENT_DATE,
    last_login TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Staff Logs Table
```sql
CREATE TABLE staff_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Available Roles

| Role | Description | Default Permissions |
|------|-------------|-------------------|
| **Admin** | Full system access | All permissions |
| **Front Office Staff** | Guest services | Bookings, Check-in/out |
| **Housekeeping Manager** | Housekeeping oversight | Housekeeping, Rooms |
| **Housekeeping Staff** | Cleaning services | Housekeeping only |

## Available Permissions

- **bookings**: Manage bookings and reservations
- **checkin**: Handle guest check-in/check-out
- **rooms**: Manage room status and information
- **housekeeping**: Handle housekeeping tasks
- **reports**: View system reports
- **staff**: Manage other staff members
- **settings**: Access system settings
- **all**: Full system access

## Email Templates

### Staff Invitation Email
- Professional HTML design
- Includes login credentials
- Role and department information
- Security warnings
- Direct login link

### Password Reset Email
- Secure password reset links
- Time-limited validity
- Clear instructions

## Setup Instructions

### 1. Database Setup
Run the database setup script:
```bash
# Execute the setup script in your Supabase SQL editor
# File: scripts/setup-database.sql
```

### 2. Environment Variables
Ensure your Supabase environment variables are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Email Service Integration
The system includes a placeholder email service. For production, integrate with:
- **SendGrid**: `npm install @sendgrid/mail`
- **AWS SES**: `npm install @aws-sdk/client-ses`
- **Resend**: `npm install resend`
- **Nodemailer**: `npm install nodemailer`

### 4. Start the Application
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Usage Guide

### Adding a New Staff Member

1. Navigate to **Staff Management** page
2. Click **"Add Staff Member"** button
3. Fill in the required information:
   - Full Name
   - Email Address
   - Phone Number (optional)
   - Role
   - Department
   - Permissions
4. Click **"Add Staff Member"**
5. An invitation email will be sent automatically

### Managing Staff Members

#### View Staff Details
- Click the **👁️** (eye) icon to view detailed information
- Shows personal info, role, permissions, and activity

#### Edit Staff Member
- Click the **✏️** (edit) icon
- Modify any information or permissions
- Click **"Update Staff Member"**

#### Toggle Status
- Click the **✅/🚫** icon to activate/deactivate staff
- Inactive staff cannot access the system

#### Delete Staff Member
- Click the **🗑️** (trash) icon
- Confirm deletion in the dialog
- **Warning**: This action cannot be undone

### Activity Monitoring

#### View Activity Logs
- Switch to **"Activity Logs"** tab
- See all staff actions and system interactions
- Track login times and IP addresses

#### Export Logs
- Click **"Export Logs"** button
- Download activity data for analysis

## Security Features

### Password Management
- Temporary passwords generated automatically
- Secure password requirements
- Password change prompts on first login

### Access Control
- Role-based permissions
- IP address logging
- Session management
- Activity tracking

### Data Protection
- Encrypted data transmission
- Secure database connections
- Input validation and sanitization

## API Endpoints

### Staff Management
```typescript
// Get all staff
GET /api/staff

// Create staff member
POST /api/staff

// Update staff member
PUT /api/staff/:id

// Delete staff member
DELETE /api/staff/:id

// Get staff logs
GET /api/staff/logs
```

### Email Service
```typescript
// Send invitation email
POST /api/email/invite

// Send password reset
POST /api/email/reset-password
```

## Customization

### Adding New Roles
1. Update the `roleConfig` object in `app/staff/page.tsx`
2. Add role to the database enum (if using PostgreSQL enums)
3. Update permission mappings

### Custom Permissions
1. Add new permission to `permissionOptions` array
2. Update role-permission mappings
3. Implement permission checks in components

### Email Templates
1. Modify templates in `lib/email-service.ts`
2. Customize styling and content
3. Add new email types as needed

## Troubleshooting

### Common Issues

#### Email Not Sending
- Check email service configuration
- Verify SMTP settings
- Check network connectivity
- Review email service logs

#### Database Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Review database permissions
- Ensure tables exist

#### Permission Issues
- Verify staff role assignments
- Check permission arrays
- Review access control logic
- Clear browser cache

### Debug Mode
Enable debug logging by setting:
```env
NEXT_PUBLIC_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Note**: This is a production-ready staff management system with comprehensive features for hotel operations. The system is designed to be scalable, secure, and user-friendly. 