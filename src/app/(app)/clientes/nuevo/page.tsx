import { PageHeader } from "@/components/layout/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "Nuevo cliente" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="Nuevo cliente" description="Registra un cliente en el directorio" />
      <CustomerForm />
    </>
  );
}
