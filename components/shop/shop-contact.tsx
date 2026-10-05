import { FaWhatsapp } from "react-icons/fa6";

export function ShopContact({
  message = "Hola Sol, tengo una duda sobre la tienda de Morvedre Core.",
}: {
  message?: string;
}) {
  return (
    <a
      href={`https://wa.me/34655111532?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="border-pool-deep focus-visible:outline-pool-blue inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border-2 bg-emerald-800 px-4 py-3 text-center text-base font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <FaWhatsapp className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>
        Preguntar a Sol por WhatsApp
        <span className="sr-only"> (abre otra ventana)</span>
      </span>
    </a>
  );
}
