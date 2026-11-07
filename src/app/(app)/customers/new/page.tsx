import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add customer",
};

export default async function NewCustomerPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader
        title="Add customer"
        description="Create a customer record for invoicing and receivable tracking."
      >
        <Button variant="outline" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </Button>
      </PageHeader>
      <CustomerForm isAdmin={user.role === "ADMIN"} />
    </>
  );
}
