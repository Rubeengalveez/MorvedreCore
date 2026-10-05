"use client";
import Link from "next/link";
import { PackageOpen, ShoppingBag, ShoppingCart } from "lucide-react";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils/cn";

export function ShopNavigation({
  profileId,
  active,
}: {
  profileId: string;
  active: "products" | "cart" | "orders";
}) {
  const cart = useShopCart(profileId);
  const count = cart.hydrated ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const links = [
    { id: "products", href: "/shop", label: "Productos", icon: ShoppingBag },
    { id: "cart", href: "/shop/cart", label: "Carrito", icon: ShoppingCart },
    { id: "orders", href: "/shop/orders", label: "Mis pedidos", icon: PackageOpen },
  ] as const;
  return (
    <nav aria-label="Tienda" className="grid grid-cols-3 gap-1 min-[375px]:gap-2">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          aria-current={active === link.id ? "page" : undefined}
          className={cn(
            "focus-visible:outline-pool-blue flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-0 py-2 text-[14px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 min-[375px]:px-1 min-[375px]:text-base",
            active === link.id
              ? "border-pool-deep bg-pool-deep text-white"
              : "border-pool-deep/65 text-pool-deep bg-white",
          )}
        >
          <span className="flex items-center gap-1.5">
            <link.icon className="h-5 w-5" aria-hidden="true" />
            {link.id === "cart" && count > 0 ? (
              <span className="bg-ball-gold text-pool-deep rounded-md px-1.5 tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <span className="whitespace-nowrap">{link.label}</span>
        </Link>
      ))}
    </nav>
  );
}
