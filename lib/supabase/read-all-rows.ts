import "server-only";

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
};

export async function readAllRows<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let expectedCount: number | undefined;
  do {
    const { data, error, count } = await fetchPage(rows.length, rows.length + 499);
    if (error) throw new Error(`No pudimos cargar ${label}: ${error.message}`);
    if (!data || count === null || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`No pudimos comprobar todos los registros de ${label}.`);
    }
    if (expectedCount !== undefined && count !== expectedCount) {
      throw new Error(`Los datos de ${label} han cambiado. Vuelve a intentarlo.`);
    }
    expectedCount = count;
    if (data.length === 0 && rows.length < count) {
      throw new Error(`La lectura de ${label} está incompleta. Vuelve a intentarlo.`);
    }
    rows.push(...data);
  } while (rows.length < expectedCount);
  if (rows.length !== expectedCount) throw new Error(`El recuento de ${label} no coincide.`);
  return rows;
}
