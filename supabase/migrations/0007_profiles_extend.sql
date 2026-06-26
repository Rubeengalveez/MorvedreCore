alter table public.profiles
  add column team_color text check (team_color is null or team_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column school_enrolled boolean not null default false,
  add column school_payment_paid boolean not null default false;
