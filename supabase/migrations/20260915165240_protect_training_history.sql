create or replace function public.prevent_training_block_delete_with_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.training_sessions where block_id = old.id) then
    raise exception 'No se puede borrar un horario con sesiones registradas.';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_training_block_delete_with_history on public.training_blocks;
create trigger prevent_training_block_delete_with_history
before delete on public.training_blocks
for each row execute function public.prevent_training_block_delete_with_history();
