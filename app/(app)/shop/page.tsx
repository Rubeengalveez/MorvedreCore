import { Shirt, Heart, Ticket, Bell, Mail, Sparkles } from "lucide-react";

import { Tienda } from "@/components/brand/pictograms";

export const metadata = {
  title: "Tienda — Morvedre Core",
  description: "Tienda del Club Waterpolo Morvedre.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header
        className="flex flex-col items-center gap-4 rounded-md border border-ink-300 bg-paper p-8 text-center"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--brand-action)" }}
      >
        <Tienda className="h-20 w-20" accent="var(--brand-action)" />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
            Tienda
          </h1>
          <p className="text-sm text-ink-600">
            Estamos cosiéndola. Mientras tanto, déjanos tu email y te avisamos en cuanto abramos.
          </p>
        </div>
      </header>

      <section
        aria-labelledby="shop-features-heading"
        className="flex flex-col gap-2"
      >
        <h2
          id="shop-features-heading"
          className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
        >
          Lo que viene
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ShopFeature
            icon={<Shirt className="h-5 w-5" />}
            title="Equipación"
            description="Gorros, bañadores y camisetas oficiales."
            color="var(--brand-blue)"
          />
          <ShopFeature
            icon={<Heart className="h-5 w-5" />}
            title="Becas"
            description="Apoya a una familia con la cuota del club."
            color="var(--brand-action)"
          />
          <ShopFeature
            icon={<Ticket className="h-5 w-5" />}
            title="Sorteos"
            description="Cestas, material y experiencias del club."
            color="var(--brand-aqua)"
          />
        </ul>
      </section>

      <section
        aria-labelledby="shop-notify-heading"
        className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper p-4"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-deep" />
          <h2
            id="shop-notify-heading"
            className="font-display text-base font-bold text-brand-deep"
          >
            Avísame
          </h2>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded border border-ink-300 bg-paper px-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue">
            <Mail className="h-4 w-4 text-ink-600" />
            <input
              type="email"
              name="email"
              required
              placeholder="tu@email.com"
              className="w-full bg-transparent text-base text-ink-900 placeholder:text-ink-600/70 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded bg-brand-blue px-5 text-base font-bold text-paper transition-colors hover:bg-brand-deep"
          >
            <Sparkles className="h-4 w-4" />
            Apúntame
          </button>
        </form>
        <p className="text-[11px] text-ink-600">
          No enviaremos spam. Solo un email cuando abramos.
        </p>
      </section>
    </div>
  );
}

function ShopFeature({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <li
      className="flex flex-col gap-2 rounded-md border border-ink-300 bg-paper p-4"
      style={{ borderLeftWidth: "4px", borderLeftColor: color }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded text-paper"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <h3 className="font-display text-base font-bold text-brand-deep">{title}</h3>
      <p className="text-xs leading-relaxed text-ink-600">{description}</p>
    </li>
  );
}
