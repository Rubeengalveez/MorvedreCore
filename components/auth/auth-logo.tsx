import Image from "next/image";

export function AuthLogo() {
  return <Image
    src="/brand/icon-192.png"
    alt="Escudo del Waterpolo Morvedre"
    width={160}
    height={160}
    priority
    className="h-[118px] w-[118px] rounded-full object-cover min-[390px]:h-[140px] min-[390px]:w-[140px] sm:h-[160px] sm:w-[160px]"
  />;
}
