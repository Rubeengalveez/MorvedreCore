"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function AdminBackLink() {
  const pathname = usePathname();
  const isSectionHome = pathname.split("/").filter(Boolean).length === 2;

  if (!isSectionHome || pathname === "/admin") return null;

  return (
    <div className="page-gutter mx-auto w-full max-w-5xl pt-3">
      <Link
        href="/admin"
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver al panel de administración
      </Link>
    </div>
  );
}
