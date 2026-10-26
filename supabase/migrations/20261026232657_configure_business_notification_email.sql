-- Recipient is configured separately in protected store settings.
alter table public.jmb_store_settings add column if not exists notification_email text check (notification_email is null or (char_length(notification_email) <= 254 and notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
