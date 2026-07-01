import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import type { Customer } from "@/lib/types";

export const metadata = { title: "Editar cliente" };
export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!data) notFound();

  return (
    <>
      <PageHeader title="Editar cliente" description={data.name} />
      <CustomerForm customer={data as Customer} />
    </>
  );
}
