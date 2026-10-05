"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { notificationBackTarget } from "@/lib/domain/notifications";

export function AdminBackLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSectionHome = pathname.split("/").filter(Boolean).length === 2;
  const fromNews = pathname === "/admin/news" && searchParams.get("from") === "news";
  const notification = notificationBackTarget(
    searchParams.get("from") ?? undefined,
    searchParams.get("notificationId") ?? undefined,
  );

  if (!isSectionHome || pathname === "/admin") return null;

  return (
    <div className="page-gutter mx-auto w-full max-w-5xl pt-3">
      <Link
        href={(notification?.href ?? (fromNews ? "/news" : "/admin")) as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-extrabold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
        {notification?.label ?? (fromNews ? "Volver a Noticias" : "Volver a Administración")}
      </Link>
    </div>
  );
}
