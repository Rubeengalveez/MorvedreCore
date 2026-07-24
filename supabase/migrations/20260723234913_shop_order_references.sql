create schema if not exists private;

create or replace function private.shop_order_alpha_index(sequence_number integer)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  remaining integer := sequence_number;
  result text := '';
begin
  if remaining < 1 then
    raise exception 'Shop order sequence must be greater than zero.';
  end if;

  while remaining > 0 loop
    remaining := remaining - 1;
    result := chr(65 + (remaining % 26)) || result;
    remaining := remaining / 26;
  end loop;

  return result;
end;
$$;

revoke all on function private.shop_order_alpha_index(integer)
  from public, anon, authenticated;
grant execute on function private.shop_order_alpha_index(integer) to service_role;

alter table public.shop_orders
  add column if not exists order_reference text;

with numbered_orders as (
  select
    id,
    (requested_at at time zone 'Europe/Madrid')::date as local_order_date,
    row_number() over (
      partition by (requested_at at time zone 'Europe/Madrid')::date
      order by requested_at, id
    )::integer as daily_sequence
  from public.shop_orders
)
update public.shop_orders as shop_order
set order_reference =
  to_char(numbered_orders.local_order_date, 'DDMMYYYY')
  || private.shop_order_alpha_index(numbered_orders.daily_sequence)
from numbered_orders
where numbered_orders.id = shop_order.id
  and shop_order.order_reference is null;

alter table public.shop_orders
  alter column order_reference set not null;

alter table public.shop_orders
  drop constraint if exists shop_orders_reference_format;

alter table public.shop_orders
  add constraint shop_orders_reference_format
  check (order_reference ~ '^[0-9]{8}[A-Z]+$');

create unique index if not exists shop_orders_reference_uidx
  on public.shop_orders (order_reference);

create table if not exists private.shop_order_daily_sequences (
  order_date date primary key,
  last_value integer not null check (last_value > 0)
);

revoke all on table private.shop_order_daily_sequences
  from public, anon, authenticated;

insert into private.shop_order_daily_sequences (order_date, last_value)
select
  (requested_at at time zone 'Europe/Madrid')::date,
  count(*)::integer
from public.shop_orders
group by (requested_at at time zone 'Europe/Madrid')::date
on conflict (order_date) do update
set last_value = greatest(
  private.shop_order_daily_sequences.last_value,
  excluded.last_value
);

create or replace function private.assign_shop_order_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_order_date date;
  daily_sequence integer;
begin
  if tg_op = 'UPDATE' then
    new.order_reference := old.order_reference;
    return new;
  end if;

  local_order_date :=
    (coalesce(new.requested_at, statement_timestamp()) at time zone 'Europe/Madrid')::date;

  insert into private.shop_order_daily_sequences (order_date, last_value)
  values (local_order_date, 1)
  on conflict (order_date) do update
  set last_value = private.shop_order_daily_sequences.last_value + 1
  returning last_value
  into daily_sequence
  ;

  new.order_reference :=
    to_char(local_order_date, 'DDMMYYYY')
    || private.shop_order_alpha_index(daily_sequence);

  return new;
end;
$$;

revoke all on function private.assign_shop_order_reference()
  from public, anon, authenticated;
grant execute on function private.assign_shop_order_reference() to service_role;

drop trigger if exists shop_orders_assign_reference on public.shop_orders;
create trigger shop_orders_assign_reference
  before insert or update of order_reference on public.shop_orders
  for each row execute function private.assign_shop_order_reference();
