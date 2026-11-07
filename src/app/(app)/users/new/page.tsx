import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";
import { requirePageAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add user",
};

export default async function NewUserPage() {
  await requirePageAdmin();
  return (
    <>
      <PageHeader title="Add user" description="Create a staff or admin account.">
        <Button variant="outline" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </PageHeader>
      <UserForm />
    </>
  );
}
