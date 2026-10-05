import type { ReactNode } from "react";
import { TeamNavigation } from "./team-navigation";

import {
  shopControl,
  shopPrimary,
  shopSecondary,
  ShopError,
  ShopField,
  ShopSection,
} from "@/components/shop/shop-ui";
export const teamControl = shopControl;
export const teamPrimary = shopPrimary;
export const teamSecondary = shopSecondary;
export function TeamSection(props: { title: string; children: ReactNode }) {
  return <ShopSection {...props} />;
}
export function TeamField(props: { label: string; htmlFor: string; children: ReactNode }) {
  return <ShopField {...props} />;
}
export function TeamError(props: { children: ReactNode }) {
  return <ShopError {...props} />;
}

export function TeamHeading({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="text-pool-deep flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight font-extrabold">{title}</h1>
        {subtitle ? (
          <p className="border-pool-deep/65 mt-2 inline-flex rounded-lg border bg-white px-3 py-1.5 text-sm font-bold">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function TeamCount({ children }: { children: ReactNode }) {
  return (
    <span className="border-pool-deep/65 text-pool-deep inline-flex shrink-0 items-center rounded-lg border bg-white px-2.5 py-1.5 text-sm font-extrabold tabular-nums">
      {children}
    </span>
  );
}

export function TeamNav({
  items,
  label,
}: {
  items: Array<{ href: string; label: string; active: boolean }>;
  label: string;
}) {
  return <TeamNavigation items={items} label={label} />;
}

export function TeamEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-6 text-center">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {description ? (
        <p className="mt-2 text-base leading-relaxed font-medium">{description}</p>
      ) : null}
    </div>
  );
}
