import type { Metadata } from "next";

import { ShopView } from "./shop-view";

export const metadata: Metadata = {
  title: "Tienda — Morvedre Core",
  description: "Tienda del Club Waterpolo Morvedre.",
};

export default function ShopPage() {
  return <ShopView />;
}
