import { Tienda } from "@/components/brand/pictograms";

export const metadata = {
  title: "Tienda — Morvedre Core",
  description: "Tienda del Club Waterpolo Morvedre.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full flex-col items-center gap-5 rounded-md border border-ink-300 bg-paper p-8 text-center">
        <Tienda className="h-24 w-24" accent="var(--brand-action)" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
            Tienda
          </h1>
          <p className="text-base text-ink-600">Próximamente — Fase 5</p>
        </div>
      </div>
    </div>
  );
}
