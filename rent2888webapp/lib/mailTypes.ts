// Tipos y helpers PUROS (sin dependencias de servidor) compartidos entre el
// server action que genera los mails y el componente cliente que los muestra.

export interface MailResult {
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string; // "$" | "u$"
  deptos: string[];
  mesNombre: string; // "Julio"
  compras: string[];
  arreglos: string[];
  comentarios: string[];
  hasNov: boolean; // true si hay compras/arreglos/comentarios reales
  matched: boolean; // false si no se encontró liquidación para el propietario
}

/** Saludo del mail: usa la col "Nombre" del sheet o cae a un saludo por defecto. */
export function greetingOf(m: Pick<MailResult, "nombre" | "propietario">): string {
  return m.nombre?.trim() || `Hola ${m.propietario}, ¿Cómo estás?`;
}

/**
 * Arma el cuerpo del mail en texto plano siguiendo el template estándar.
 * Solo incluye las secciones que tienen ítems.
 */
export function buildMailBody(m: MailResult): string {
  const parts: string[] = [];
  parts.push(greetingOf(m));
  parts.push(
    `Les hacemos entrega del informe detallado correspondiente al mes de ${m.mesNombre}. Como es habitual, en los próximos días les estaremos enviando el dinero de la liquidación.`
  );

  const section = (titulo: string, items: string[]) => {
    if (!items.length) return;
    parts.push(`${titulo}\n${items.map((i) => `• ${i}`).join("\n")}`);
  };

  section("🛒 Compras Realizadas durante el mes", m.compras);
  section("🔧 Arreglos Realizados en el mes", m.arreglos);
  section("📝 Comentarios del mes", m.comentarios);

  parts.push("Muchas gracias por seguir confiando en nuestra gestión.\n¡Saludos!");
  return parts.join("\n\n");
}
