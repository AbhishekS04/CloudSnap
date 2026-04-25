-- Migration: Add telegram_message_ids to assets table for synchronized deletion
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS telegram_message_ids JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.assets.telegram_message_ids IS 'Array of Telegram message IDs for the uploaded file/chunks. Used for physical deletion.';
