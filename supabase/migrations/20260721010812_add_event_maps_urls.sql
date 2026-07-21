alter table public.training_blocks
  add column maps_url text
  constraint training_blocks_maps_url_https
  check (
    maps_url is null
    or (char_length(maps_url) <= 2048 and maps_url ~* '^https://')
  );

alter table public.training_sessions
  add column maps_url text
  constraint training_sessions_maps_url_https
  check (
    maps_url is null
    or (char_length(maps_url) <= 2048 and maps_url ~* '^https://')
  );

alter table public.matches
  add column maps_url text
  constraint matches_maps_url_https
  check (
    maps_url is null
    or (char_length(maps_url) <= 2048 and maps_url ~* '^https://')
  );
