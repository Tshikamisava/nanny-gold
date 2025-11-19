# 🚀 Supabase Setup Guide for NannyGold

## Step 1: Create a New Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign in or create an account**
3. **Click "New Project"**
4. **Fill in project details:**
   - Organization: Choose your organization
   - Name: `nanny-gold` (or any name you prefer)
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to your location

## Step 2: Get Your Project Credentials

Once your project is created:

1. **Go to Settings > API**
2. **Copy these values:**
   - Project URL (looks like: `https://your-project-ref.supabase.co`)
   - anon/public key (starts with `eyJ...`)

## Step 3: Update Your Environment Variables

Replace the contents of your `.env` file with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

## Step 4: Update Supabase Configuration

Update `supabase/config.toml`:

```toml
project_id = "your-project-ref"

[functions.send-otp]
verify_jwt = false

[functions.send-sms-otp]
verify_jwt = false

[functions.verify-sms-otp]
verify_jwt = false

[functions.calculate-booking-time]
verify_jwt = false

[functions.calculate-hourly-pricing]
verify_jwt = false
```

## Step 5: Set Up Database Schema

In your Supabase dashboard, go to the SQL Editor and run this setup script:

```sql
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade,
  email text,
  first_name text,
  last_name text,
  user_type text check (user_type in ('client', 'nanny', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Create bookings table
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id),
  nanny_id uuid references profiles(id),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  status text check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')) default 'pending',
  total_amount numeric,
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create interviews table
create table interviews (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id),
  nanny_id uuid references profiles(id),
  interview_date timestamp with time zone not null,
  status text check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoices table
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id),
  booking_id uuid references bookings(id),
  amount numeric not null,
  status text check (status in ('pending', 'paid', 'overdue')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table interviews enable row level security;
alter table invoices enable row level security;

-- Create policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can view own bookings" on bookings
  for select using (auth.uid() = client_id or auth.uid() = nanny_id);

create policy "Clients can create bookings" on bookings
  for insert with check (auth.uid() = client_id);
```

## Step 6: Set Up Authentication

In your Supabase dashboard:

1. **Go to Authentication > Settings**
2. **Enable Email confirmations if desired**
3. **Configure any OAuth providers you want**
4. **Set up custom SMTP (optional)**

## Step 7: Create Edge Functions (Optional)

If you need the email OTP functionality, create these edge functions:

1. **In your terminal, run:**
```bash
npx supabase functions new send-otp
```

2. **Add the function code for sending OTP emails**

## Step 8: Test Your Connection

1. **Save your .env file**
2. **Restart your development server:**
```bash
npm run dev
```

3. **Open your app and test the login/signup functionality**

## Need Help?

If you run into any issues:

1. **Check the browser console for errors**
2. **Verify your environment variables are loaded**
3. **Test the connection in browser dev tools:**
```javascript
await fetch('https://your-project-ref.supabase.co/rest/v1/')
```

## Quick Setup Script

Here's what I can help you with right now:

1. **Tell me your new Supabase project URL and anon key**
2. **I'll update all the configuration files automatically**
3. **We'll test the connection together**

---

**What's your new Supabase project URL and anon key?** 🔑