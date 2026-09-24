import Link from "next/link";
import type { Route } from "next";
import { Clock3 } from "lucide-react";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";

export const metadata = { title: "Solicitud pendiente — Morvedre Core" };

export default function PendingAccessPage() {
  return (
    <AuthRequestShell title="Solicitud en revisión" subtitle="Ya hemos recibido tus datos.">
      <div className="bg-pool-foam/60 text-pool-deep flex flex-col items-center gap-3 rounded-2xl p-5 text-center">
        <Clock3 className="text-pool-blue h-9 w-9" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          El club comprobará tu perfil. Cuando esté aprobado, vuelve a entrar con Google.
          Si pediste acceso con correo, el administrador te entregará una contraseña provisional.
        </p>
      </div>
      <Link href={"/login" as Route}
        className="bg-pool-deep text-paper mt-4 flex min-h-12 items-center justify-center rounded-xl px-4 font-bold">
        Volver al acceso
      </Link>
    </AuthRequestShell>
  );
}
