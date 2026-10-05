create table if not exists public.shop_email_deliveries (
  event_key text not null,
  recipient text not null,
  status text not null default 'processing' check (status in ('processing','sent','failed')),
  payload jsonb,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (event_key, recipient)
);
alter table public.shop_email_deliveries enable row level security;
revoke all on public.shop_email_deliveries from anon, authenticated;
grant select, insert, update, delete on public.shop_email_deliveries to service_role;
