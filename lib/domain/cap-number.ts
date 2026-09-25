export const MAX_CAP_NUMBER = 14;

export function validCapNumber(value: number | null | undefined): number | null {
  return value != null && Number.isInteger(value) && value >= 1 && value <= MAX_CAP_NUMBER
    ? value
    : null;
}
