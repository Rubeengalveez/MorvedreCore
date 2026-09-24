"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function AdminBackLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSectionHome = pathname.split("/").filter(Boolean).length === 2;
  const fromNews = pathname === "/admin/news" && searchParams.get("from") === "news";

  if (!isSectionHome || pathname === "/admin") return null;

  return (
    <div className="page-gutter mx-auto w-full max-w-5xl pt-3">
      <Link
        href={fromNews ? "/news" : "/admin"}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {fromNews ? "Volver a Noticias" : "Volver al panel de administración"}
      </Link>
    </div>
  );
}
