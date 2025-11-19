-- Fix sender_id column to allow system messages
-- Change sender_id from UUID NOT NULL to TEXT to allow 'system' value

ALTER TABLE public.support_chat_messages ALTER COLUMN sender_id TYPE TEXT;