# RLS Policy Analysis - Nanny Profile Data Persistence Issue

## Problem Identified

The nanny profile data is not persisting because of conflicting RLS (Row Level Security) policies on the `nannies` table.

## Root Cause

### SELECT Policy Conflict

1. **Original Policy (migration 20250613092808):**
   ```sql
   CREATE POLICY "Anyone can view nannies" 
   ON public.nannies FOR SELECT TO authenticated USING (true);
   ```
   This allows ALL authenticated users to view ALL nannies.

2. **Later Policy Override (migration 20250825071009):**
   ```sql
   CREATE POLICY "Authenticated users can view approved nannies" 
   ON public.nannies FOR SELECT 
   USING (auth.uid() IS NOT NULL AND approval_status = 'approved');
   ```
   This OVERRIDES the original policy and only allows viewing nannies with `approval_status = 'approved'`.

### The Issue

**Nannies with `approval_status = 'pending'` CANNOT SELECT their own profile!**

When a nanny tries to:
1. Load their profile → SELECT query returns 0 rows (blocked by RLS)
2. Update their profile → UPDATE might succeed, but they can't verify it because SELECT is blocked
3. Navigate back → SELECT fails again, so data appears "wiped"

### Current Policies

- **SELECT:** Only allows viewing if `approval_status = 'approved'` ❌ (blocks pending nannies)
- **UPDATE:** `"Nannies can update their own profile" USING (auth.uid() = id)` ✅ (should work)
- **INSERT:** `"Nannies can insert their own profile" WITH CHECK (auth.uid() = id)` ✅ (should work)

## Solution

We need to add a policy that allows nannies to SELECT their OWN profile regardless of approval status, while keeping the restriction for viewing OTHER nannies.

The policy should be:
```sql
CREATE POLICY "Nannies can view their own profile" 
ON public.nannies FOR SELECT 
USING (auth.uid() = id);
```

This allows nannies to view their own profile even if their status is 'pending', 'rejected', etc.




