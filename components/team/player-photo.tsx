"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function PlayerPhoto({
  src,
  name,
  teamColor,
  size = 80,
  square = false,
}: {
  src: string | null;
  name: string;
  teamColor: string;
  size?: number;
  square?: boolean;
}) {
  const avatar = (
    <Avatar
      src={src}
      name={name}
      size={size}
      teamColor={teamColor}
      style={{ backgroundColor: "var(--pool-deep)" }}
      className={`shadow-elev-2 border-4 ${square ? "rounded-2xl" : ""}`}
    />
  );
  const shape = square ? "rounded-2xl" : "rounded-full";
  if (!src)
    return <span className={`inline-flex shrink-0 ${shape} ring-4 ring-white/25`}>{avatar}</span>;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Ampliar foto de ${name}`}
          className={`inline-flex shrink-0 ${shape} ring-4 ring-white/25 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white`}
        >
          {avatar}
        </button>
      </SheetTrigger>
      <SheetContent
        size="full"
        showClose={false}
        className="bg-pool-deep h-dvh gap-3 rounded-none border-0 text-white [&>div:first-child]:hidden"
      >
        <SheetTitle className="sr-only">Foto de {name}</SheetTitle>
        <SheetDescription className="sr-only">
          Foto ampliada. Cierra esta vista para volver a la ficha del jugador.
        </SheetDescription>
        <div className="flex shrink-0 justify-end px-4 pt-4">
          <SheetClose className="text-pool-deep inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-white bg-blue-50 px-4 font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Cerrar foto <X aria-hidden="true" className="h-5 w-5" />
          </SheetClose>
        </div>
        <SheetBody className="flex min-h-0 overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative h-full w-full">
            <Image src={src} alt={name} fill sizes="100vw" className="object-contain" />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
