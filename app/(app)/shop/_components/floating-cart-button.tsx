import { CartButton } from "./cart-button";

export function FloatingCartButton({ profileId }: { profileId: string }) {
  return (
    <div className="pointer-events-none sticky top-[calc(var(--top-bar-height)+0.75rem)] z-30 -mb-12 flex h-12 justify-end">
      <CartButton profileId={profileId} className="shadow-elev-3 pointer-events-auto" />
    </div>
  );
}
