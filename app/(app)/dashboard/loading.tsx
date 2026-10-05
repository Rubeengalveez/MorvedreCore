import { PageShell } from "@/components/ui/page-shell";
import Image from "next/image";

export default function HomeLoading() {
  return (
    <PageShell width="md">
      <div role="status" aria-label="Preparando Inicio" aria-busy="true" className="space-y-5">
        <div className="bg-pool-deep border-pool-deep flex items-center gap-4 rounded-2xl border-2 p-5 text-white">
          <Image
            src="/brand/logo.webp"
            alt=""
            width={72}
            height={72}
            className="h-18 w-18 shrink-0 object-contain"
          />
          <div>
            <p className="text-ball-gold text-sm font-bold">Morvedre Core</p>
            <p className="mt-1 text-xl font-extrabold">Preparando tu día…</p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="border-pool-deep/70 rounded-2xl border-2 bg-white p-5 motion-safe:animate-pulse"
        >
          <div className="h-5 w-2/3 rounded-lg bg-blue-100" />
          <div className="mt-5 h-12 rounded-lg bg-blue-50" />
          <div className="mt-3 h-12 rounded-lg bg-blue-50" />
        </div>
      </div>
    </PageShell>
  );
}
