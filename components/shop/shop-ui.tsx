import type { ReactNode } from "react";

export const shopControl =
  "min-h-14 w-full rounded-xl border-2 border-pool-deep/65 bg-white px-3 text-base text-pool-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue disabled:opacity-60";
export const shopPrimary =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-pool-deep bg-pool-deep px-4 text-base font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue disabled:opacity-60";
export const shopSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-pool-deep/65 bg-white px-3 text-base font-bold text-pool-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue disabled:opacity-60";

export function ShopSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white">
      <h2 className="bg-pool-deep px-4 py-3 text-lg font-extrabold text-white">{title}</h2>
      <div className="space-y-5 p-4">{children}</div>
    </section>
  );
}
export function ShopField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-pool-deep block text-base font-extrabold">
        {label}
      </label>
      {children}
    </div>
  );
}
export function ShopError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900"
    >
      {children}
    </div>
  );
}
