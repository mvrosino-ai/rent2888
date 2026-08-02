"use server";

import { revalidateTag } from "next/cache";

/**
 * Fuerza una recarga fresca del Google Sheet.
 *
 * getSheetData() cachea la respuesta del Sheet 5 minutos con la tag "sheet"
 * (stale-while-revalidate). Cuando el admin edita el Sheet y quiere ver el
 * cambio al instante —sin esperar a que expire la caché— este action
 * invalida esa tag: la próxima lectura vuelve a pedir los datos a Google.
 */
export async function refreshSheet() {
  revalidateTag("sheet");
}
