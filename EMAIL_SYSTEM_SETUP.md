# Email System Setup Guide

## Overview
This system allows clients and nannies to send emails from NannyGold's official email addresses:
- **care@nannygold.co.za** - General care and support inquiries
- **bespoke@nannygold.co.za** - Premium and bespoke services

All emails include the official NannyGold signature with the address:
335 Long Avenue, Ferndale, Johannesburg, Gauteng

## Setup Steps

### 1. Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and run the entire contents of:
supabase/migrations/20251211_email_logs_table.sql
```

This creates the `email_logs` table to track all emails sent through the system.

### 2. Deploy Edge Function

```powershell
# Deploy the send-nannygold-email edge function
cd supabase/functions
supabase functions deploy send-nannygold-email
```

### 3. Set Environment Variables

In your Supabase Dashboard → Project Settings → Edge Functions, add:

```
RESEND_API_KEY=your_resend_api_key_here
```

**Get Resend API Key:**
1. Go to https://resend.com
2. Sign up/login
3. Create an API key
4. Add the domain `nannygold.co.za` and verify it
5. Configure SPF and DKIM records for email authentication

### 4. Configure DNS for Email Addresses

Add these DNS records to your domain:

**For care@nannygold.co.za and bespoke@nannygold.co.za:**

```
TXT @ "v=spf1 include:_spf.resend.com ~all"
CNAME resend._domainkey resend._domainkey.resend.com
```

## Usage

### For Clients
Navigate to: `/client/emails`
- Select email address (care or bespoke)
- Enter recipient email(s)
- Compose message
- Send

### For Nannies
Navigate to: `/nanny/emails`
- Select email address (care or bespoke)
- Enter recipient email(s)
- Compose message
- Send

### For Admins
Navigate to: `/admin/emails`
- Send emails from either address
- View all email history from all users
- Monitor email delivery status

## Features

✅ **Role-based access** - Clients, nannies, and admins can all send emails
✅ **Official branding** - All emails include NannyGold signature
✅ **Email logging** - All sent emails are tracked in database
✅ **Delivery tracking** - Track sent/failed/bounced status
✅ **Reply-to support** - Recipients can reply directly
✅ **Multiple recipients** - Send to multiple emails at once
✅ **Email history** - Users can view their sent email history

## Email Template

All emails are automatically formatted with:

1. Sender information (name and role)
2. Email content
3. Professional signature with:
   - Company name and service type
   - Physical address
   - Contact email
   - Website link

## Security

- ✅ User authentication required
- ✅ Row Level Security (RLS) enabled on email_logs
- ✅ Users can only view their own email history
- ✅ Admins can view all email history
- ✅ Edge function validates user ID matches authenticated user

## Testing

After setup, test the system:

1. Login as a client
2. Navigate to `/client/emails`
3. Send a test email to your own email address
4. Check:
   - Email received with proper formatting
   - Email appears in history tab
   - Signature includes correct details

## Troubleshooting

**Emails not sending:**
- Check RESEND_API_KEY is set correctly
- Verify domain is verified in Resend
- Check DNS records are configured

**Email not appearing in history:**
- Check RLS policies on email_logs table
- Verify user is authenticated

**Wrong sender name:**
- Check profile has first_name and last_name filled in
