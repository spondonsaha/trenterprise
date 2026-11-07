"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createUser, updateUser } from "@/app/actions/users";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/validation";

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  canOverridePrice: boolean;
};

export function UserForm({
  initial,
}: {
  initial?: UserFormValues & { id: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);
  const schema = isEdit ? userUpdateSchema : userCreateSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<UserFormValues>,
    defaultValues:
      initial ??
      {
        name: "",
        email: "",
        password: "",
        role: "STAFF",
        active: true,
        canOverridePrice: false,
      },
  });

  async function onSubmit(values: UserFormValues) {
    setPending(true);
    try {
      const result = initial?.id
        ? await updateUser({ ...values, id: initial.id } as UserUpdateInput)
        : await createUser(values as UserCreateInput);
      if (result.ok) {
        toast.success(isEdit ? "User updated." : "User created.");
        router.push("/users");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{isEdit ? "Account details" : "New user account"}</CardTitle>
          <CardDescription>
            Admin accounts can change rates, cancel invoices, manage suppliers and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Full name</Label>
            <Input id="user-name" disabled={pending} {...register("name")} />
            {errors.name ? <ErrorText message={errors.name.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" disabled={pending} {...register("email")} />
            {errors.email ? <ErrorText message={errors.email.message} /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={pending}
              {...register("role")}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-password">
              {isEdit ? "New password (optional)" : "Password"}
            </Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? "Leave blank to keep current password" : "At least 8 characters"}
              disabled={pending}
              {...register("password")}
            />
            {errors.password ? <ErrorText message={errors.password.message} /> : null}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
              disabled={pending}
              {...register("canOverridePrice")}
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                May override invoice prices
              </span>
              <span className="block text-xs text-slate-500">
                Allows staff to change product rates on invoices and override invoice totals.
              </span>
            </span>
          </label>

          {isEdit ? (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50/60 p-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                disabled={pending}
                {...register("active")}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Active account</span>
                <span className="block text-xs text-slate-500">
                  Inactive users cannot sign in. You cannot deactivate or demote your own account.
                </span>
              </span>
            </label>
          ) : null}
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>{isEdit ? "Save changes" : "Create account"}</CardTitle>
          <CardDescription>
            Passwords are hashed with bcrypt before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save user" : "Create user"}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild disabled={pending}>
            <Link href="/users">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}
