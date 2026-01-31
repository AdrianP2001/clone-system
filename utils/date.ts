/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD) respetando la zona horaria local.
 * Esto es crítico para el SRI ya que toISOString() devuelve UTC y puede adelantar la fecha.
 */
export const getLocalDateISO = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
