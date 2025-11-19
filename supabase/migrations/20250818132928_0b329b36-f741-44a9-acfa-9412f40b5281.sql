-- Fix admin user data inconsistencies
-- 1. Update admin user profile to have correct user_type
UPDATE public.profiles 
SET user_type = 'admin' 
WHERE id = 'e517a404-89a1-4513-ad89-12d5c215f0b3' AND email = 'care@nannygold.co.za';

-- 2. Remove admin user from clients table since they should not be a client
DELETE FROM public.clients 
WHERE id = 'e517a404-89a1-4513-ad89-12d5c215f0b3';

-- 3. Ensure Tlotlo Khomo has proper client setup
INSERT INTO public.clients (id) 
VALUES ('1ab36b58-f817-4691-8017-7326fe0f498a')
ON CONFLICT (id) DO NOTHING;