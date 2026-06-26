-- Seed: datos iniciales para el primer arranque.
-- El admin se crea desde scripts/bootstrap-admin.mjs usando la service role key.
-- Las tablas de referencia (categories_config, treasury_concepts, seasons) llegan
-- en migraciones posteriores, no se siembran aquí.

-- Próximas tablas a crear en migraciones siguientes:
--   - categories_config (mapeo birth_year_offset → category_code)
--   - treasury_concepts (kind, periodicity, default_amount_cents)
--   - seasons (con índice parcial único sobre is_current)
--   - teams, team_staff, team_rosters
--   - training_blocks, training_sessions, training_attendance
--   - matches, match_availability, match_callups, match_stats
--   - news_posts, news_reactions
--   - shop_products, shop_orders, shop_order_items
--   - treasury_period_closures, treasury_lines
--   - travel_offers, travel_reservations
--   - historical_player_stats, historical_team_matchups, audit_log

-- El admin (galvillo9@gmail.com) se crea al ejecutar `pnpm bootstrap`.
-- No insertamos nada aquí para no duplicar el auth_user_id.
