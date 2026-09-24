alter table public.notifications drop constraint notifications_kind_check;

alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'convocatoria', 'match_reminder', 'training_cancelled',
    'training_absence', 'training_attendance_corrected',
    'news_pinned', 'result_published', 'monthly_close', 'access_request'
  ));
