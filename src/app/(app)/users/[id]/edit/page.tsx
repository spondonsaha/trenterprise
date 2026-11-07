import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Edit user",
};

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await requirePageAdmin();
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      canOverridePrice: true,
    },
  });
  if (!user) notFound();

  return (
    <>
      <PageHeader
        title="Edit user"
        description={`Update the account for ${user.name}.`}
      >
        <Button variant="outline" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </PageHeader>
      <UserForm
        initial={{
          id: user.id,
          name: user.name,
          email: user.email,
          password: "",
          role: user.role,
          active: user.active,
          canOverridePrice: user.canOverridePrice,
        }}
      />
    </>
  );
}
