alter table public.shop_products
  add column personalization_enabled boolean not null default false,
  add column personalization_label text not null default 'Nombre',
  add column personalization_max_length smallint not null default 30;

alter table public.shop_products
  add constraint shop_products_personalization_label_length
    check (char_length(personalization_label) between 1 and 40),
  add constraint shop_products_personalization_max_length_range
    check (personalization_max_length between 1 and 60);

alter table public.shop_order_items
  add column personalization text;

alter table public.shop_order_items
  add constraint shop_order_items_personalization_length
    check (personalization is null or char_length(personalization) between 1 and 60);
