import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

console.log("=== Verificando / creando storage bucket 'news' ===");

const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
if (bucketListError) {
  console.log("  listBuckets err:", bucketListError.message);
}

let news = buckets?.find((b) => b.id === "news");
if (!news) {
  console.log("  bucket 'news' no existe, creándolo...");
  const { data: created, error: createError } = await supabase.storage.createBucket("news", {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (createError) {
    console.log("  createBucket err:", createError.message);
  } else {
    console.log("  ✓ bucket 'news' creado");
    news = created;
  }
} else {
  console.log("  bucket 'news' ya existe");
}

console.log("\n=== Creando policies de storage para news ===");
const policies = [
  {
    name: "news_storage_select",
    sql: `drop policy if exists news_storage_select on storage.objects;
create policy news_storage_select on storage.objects for select to authenticated using (bucket_id = 'news');`,
  },
  {
    name: "news_storage_insert",
    sql: `drop policy if exists news_storage_insert on storage.objects;
create policy news_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'news' and (storage.foldername(name))[1] = 'news' and public.is_admin());`,
  },
  {
    name: "news_storage_update",
    sql: `drop policy if exists news_storage_update on storage.objects;
create policy news_storage_update on storage.objects for update to authenticated using (bucket_id = 'news' and public.is_admin()) with check (bucket_id = 'news' and public.is_admin());`,
  },
  {
    name: "news_storage_delete",
    sql: `drop policy if exists news_storage_delete on storage.objects;
create policy news_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'news' and public.is_admin());`,
  },
];

for (const p of policies) {
  console.log("  → policy " + p.name);
}

console.log("\n=== Verificando tablas news ===");
for (const t of ["news_posts", "news_reactions"]) {
  const { error } = await supabase.from(t).select("*", { count: "exact", head: true }).limit(1);
  if (error) console.log(t + ": " + error.message);
  else console.log(t + ": OK");
}

const { data: bucketList } = await supabase.storage.listBuckets();
const finalNews = bucketList?.find((b) => b.id === "news");
console.log("\nstorage bucket 'news':", finalNews ? "OK" : "MISSING");

console.log("\n=== NOTE: news_storage policies deben aplicarse via SQL Editor ===");
console.log("=== He dejado el SQL en supabase/migrations/0027_news_storage.sql ===");

process.exit(0);
