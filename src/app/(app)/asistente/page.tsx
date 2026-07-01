import { PageHeader } from "@/components/layout/page-header";
import { AiChat } from "@/components/assistant/ai-chat";

export const metadata = { title: "Asistente IA" };

/** MÓDULO 10 — Asistente de inteligencia artificial. */
export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Asistente IA"
        description="Pregunta en lenguaje natural sobre tu inventario, ventas y clientes"
      />
      <AiChat />
    </>
  );
}
