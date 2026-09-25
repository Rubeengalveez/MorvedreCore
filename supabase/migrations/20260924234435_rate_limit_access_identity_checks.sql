create table public.access_identity_checks (
  id bigint generated always as identity primary key,
  requester_hash text not null,
  checked_at timestamptz not null default now()
);

create index access_identity_checks_requester_time_idx
  on public.access_identity_checks (requester_hash, checked_at desc);
create index access_identity_checks_checked_at_idx
  on public.access_identity_checks (checked_at);

alter table public.access_identity_checks enable row level security;
revoke all on public.access_identity_checks from anon, authenticated;
grant select, insert, delete on public.access_identity_checks to service_role;
revoke all on sequence public.access_identity_checks_id_seq from anon, authenticated;
grant usage, select on sequence public.access_identity_checks_id_seq to service_role;
