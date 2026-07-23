import { redirect } from "next/navigation";

// Vista "Interno" deshabilitada: la ruta redirige a Liquidaciones para no
// ejecutar consultas que no corresponden. Reactivar restaurando el contenido anterior.
export default function InternoPage() {
  redirect("/admin");
}
