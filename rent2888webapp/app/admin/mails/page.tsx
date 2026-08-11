import { Topbar } from "@/components/Topbar";
import { MailsClient } from "./MailsClient";
import { loadMailsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MailsPage() {
  // Carga inicial de los mails ya guardados del mes en curso (sin llamar a la IA).
  const initial = await loadMailsAction();
  return (
    <>
      <Topbar />
      <MailsClient initial={initial} />
    </>
  );
}
