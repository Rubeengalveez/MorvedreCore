const SUPPORT_PHONE = "34691745220";

export function supportWhatsAppUrl(message: string): string {
  return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
}
