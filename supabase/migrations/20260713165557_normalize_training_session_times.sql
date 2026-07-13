update public.training_sessions as session
set scheduled_at = (
  (session.scheduled_at at time zone 'UTC')::date + block.start_time
) at time zone 'Europe/Madrid'
from public.training_blocks as block
where block.id = session.block_id
  and (
    session.scheduled_at at time zone 'Europe/Madrid'
  )::time is distinct from block.start_time;

delete from public.training_attendance as attendance
using public.training_sessions as session
where attendance.session_id = session.id
  and session.scheduled_at > now();
