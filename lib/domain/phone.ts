export function normalizeSpanishPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) return null;
  const international = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const normalized = /^\d{9}$/.test(international) ? `+34${international}` : international;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function toSpanishPhoneDigits(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  const nationalDigits = digits.length > 9 && digits.startsWith("34") ? digits.slice(2) : digits;
  return nationalDigits.slice(0, 9);
}
