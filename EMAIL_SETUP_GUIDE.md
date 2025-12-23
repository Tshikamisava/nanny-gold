# Email System Setup Guide

## Overview
NannyGold uses the Resend API for sending emails from official NannyGold email addresses. The system supports two email addresses:
- `care@nannygold.co.za` - General care and support inquiries
- `bespoke@nannygold.co.za` - Premium and bespoke service requests

## Setup Requirements

### 1. Resend API Key
You need a Resend API key to send emails. Get one from [resend.com](https://resend.com).

### 2. Supabase Environment Variables
Add the following environment variable to your Supabase project:

```bash
RESEND_API_KEY=your_resend_api_key_here
```

**How to add environment variables in Supabase:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Add the `RESEND_API_KEY` environment variable

### 3. Domain Verification (Production)
For production use, you'll need to verify your domain with Resend:
1. Add `nannygold.co.za` as a verified domain in Resend
2. Configure DNS records as instructed by Resend

## Testing the Email System

### Using the Built-in Tester
1. Navigate to the email page for your user type:
   - Admin: `/admin/emails`
   - Nanny: `/nanny/emails`
   - Client: `/client/emails`

2. Click on the "Test" tab

3. Enter your email address and click "Send Test Email"

4. Check your email (including spam folder) for the test message

### Manual Testing
You can also test emails manually by composing and sending emails through the "Compose" tab.

## Email Features

### Available Email Addresses
- **Care**: `care@nannygold.co.za` - General support and care inquiries
- **Bespoke**: `bespoke@nannygold.co.za` - Premium and bespoke services

### Email Logging
All sent emails are logged in the `email_logs` table with:
- User ID and role
- From and to addresses
- Subject and status
- Resend message ID
- Error messages (if any)

### Email History
View sent email history in the "History" tab of each email page.

## Troubleshooting

### Common Issues

1. **"RESEND_API_KEY not configured"**
   - Check that the environment variable is set in Supabase Edge Functions settings

2. **Emails going to spam**
   - This is normal for test emails. In production, verified domains help with deliverability

3. **Authentication errors**
   - Make sure you're logged in to the application

4. **Network errors**
   - Check your internet connection and Supabase service status

### Debug Steps

1. Check browser console for error messages
2. Verify Supabase Edge Function is deployed
3. Test with the built-in email tester
4. Check email logs in the database

## Email Templates

The system automatically adds:
- NannyGold branding and signature
- Sender information
- Professional HTML formatting
- Responsive design for mobile devices

## Security

- All emails require user authentication
- User roles are validated before sending
- Email content is logged for audit purposes
- Rate limiting is handled by Resend API