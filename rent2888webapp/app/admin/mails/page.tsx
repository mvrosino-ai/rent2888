import { Topbar } from "@/components/Topbar";
import { MailsClient } from "./MailsClient";

export const dynamic = "force-dynamic";

export default function MailsPage() {
  return (
    <>
      <Topbar />
      <MailsClient />
    </>
  );
}
