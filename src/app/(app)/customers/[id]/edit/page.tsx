import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Edit customer",
};

export default async function EditCustomerPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const user = await requirePageUser();
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title="Edit customer"
        description={`Update contact and receivable details for ${customer.name}.`}
      >
        <Button variant="outline" asChild>
          <Link href={`/customers/${customer.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to customer
          </Link>
        </Button>
      </PageHeader>
      <CustomerForm
        isAdmin={user.role === "ADMIN"}
        initial={{
          id: customer.id,
          name: customer.name,
          contactPerson: customer.contactPerson ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
          openingBalance: Number(customer.openingBalance),
          active: customer.active,
        }}
      />
    </>
  );
}
