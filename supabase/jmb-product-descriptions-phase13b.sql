-- JMB 2 Creations Operational Phase 13B
-- Adds an optional customer-facing description to every live catalog product/variant.
-- Existing products remain valid and simply start with no description.

alter table public.jmb_catalog_items
  add column if not exists description text;

comment on column public.jmb_catalog_items.description is
  'Optional customer-facing product notes such as dimensions, materials, fit, included parts, or other details.';
