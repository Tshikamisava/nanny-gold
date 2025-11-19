# 🚀 Quick Supabase Setup for NannyGold

## Your app is now running in DEMO MODE! 🎭

The app will work with mock data while you set up your real Supabase project.

## Create Your Own Supabase Project (5 minutes)

### Step 1: Create Project
1. Go to **[supabase.com](https://supabase.com)**
2. Sign up/Sign in
3. Click **"New Project"**
4. Choose a name: `nanny-gold`
5. Set a strong database password
6. Wait for project creation (~2 minutes)

### Step 2: Get Your Credentials
Once created, go to **Settings → API**:
- **Project URL**: `https://your-project-id.supabase.co`
- **anon key**: `eyJ...` (the long token)

### Step 3: Update Your .env File
Replace the content in `.env` with:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-actual-anon-key...
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your-actual-anon-key...
```

### Step 4: Set Up Database
In Supabase dashboard → **SQL Editor**, run this:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  first_name text,
  last_name text,
  user_type text check (user_type in ('client', 'nanny', 'admin')),
  phone text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create bookings table
create table if not exists bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) on delete cascade,
  nanny_id uuid references profiles(id) on delete cascade,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  status text check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')) default 'pending',
  total_amount numeric(10,2),
  hourly_rate numeric(8,2),
  rating integer check (rating >= 1 and rating <= 5),
  review_text text,
  special_instructions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create interviews table
create table if not exists interviews (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) on delete cascade,
  nanny_id uuid references profiles(id) on delete cascade,
  interview_date timestamp with time zone not null,
  interview_type text check (interview_type in ('video', 'in_person', 'phone')) default 'video',
  status text check (status in ('scheduled', 'completed', 'cancelled', 'no_show')) default 'scheduled',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create invoices table
create table if not exists invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  status text check (status in ('pending', 'paid', 'overdue', 'cancelled')) default 'pending',
  due_date timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table interviews enable row level security;
alter table invoices enable row level security;

-- Create RLS policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Bookings policies
create policy "Users can view related bookings" on bookings
  for select using (auth.uid() = client_id or auth.uid() = nanny_id);

create policy "Clients can create bookings" on bookings
  for insert with check (auth.uid() = client_id);

create policy "Users can update related bookings" on bookings
  for update using (auth.uid() = client_id or auth.uid() = nanny_id);

-- Interview policies  
create policy "Users can view related interviews" on interviews
  for select using (auth.uid() = client_id or auth.uid() = nanny_id);

create policy "Users can create interviews" on interviews
  for insert with check (auth.uid() = client_id or auth.uid() = nanny_id);

-- Invoice policies
create policy "Users can view related invoices" on invoices
  for select using (auth.uid() = client_id);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Step 5: Restart Your App
```bash
npm run dev
```

## ✅ You're Done!

Your app will now connect to your real Supabase database instead of using demo mode.

## Need Help?

- **Supabase Docs**: [docs.supabase.com](https://docs.supabase.com)
- **Troubleshooting**: Check browser console for any errors
- **Test Connection**: The app will show connection status

---

**Your app is working in demo mode right now. Follow the steps above to connect to real Supabase! 🚀**