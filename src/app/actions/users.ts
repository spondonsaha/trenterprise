"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionAdmin } from "@/lib/permissions";
import { userCreateSchema, userUpdateSchema, type UserCreateInput, type UserUpdateInput } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export async function createUser(input: UserCreateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireActionAdmin();
    const data = userCreateSchema.parse(input);
    const passwordHash = await bcrypt.hash(data.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role === "ADMIN" ? Role.ADMIN : Role.STAFF,
          canOverridePrice: data.canOverridePrice,
          active: true,
        },
      });
      await writeAudit({
        tx,
        userId: admin.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: createdUser.id,
        details: { name: createdUser.name, email: createdUser.email, role: createdUser.role },
      });
      return createdUser;
    });

    revalidatePath("/users");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function updateUser(input: UserUpdateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireActionAdmin();
    const data = userUpdateSchema.parse(input);

    if (data.id === admin.id && (!data.active || data.role !== "ADMIN")) {
      throw new AppError("You cannot deactivate or demote your own account.");
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: data.id } });
      if (!existing) throw new AppError("User not found.");

      const losingAdmin =
        existing.role === Role.ADMIN &&
        existing.active &&
        (!data.active || data.role !== "ADMIN");
      if (losingAdmin) {
        const otherAdmins = await tx.user.count({
          where: {
            id: { not: existing.id },
            role: Role.ADMIN,
            active: true,
          },
        });
        if (otherAdmins === 0) {
          throw new AppError("At least one active admin account is required.");
        }
      }

      const passwordHash = data.password
        ? await bcrypt.hash(data.password, 10)
        : undefined;

      await tx.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          role: data.role === "ADMIN" ? Role.ADMIN : Role.STAFF,
          active: data.active,
          canOverridePrice: data.canOverridePrice,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      await writeAudit({
        tx,
        userId: admin.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: data.id,
        details: {
          name: data.name,
          email: data.email,
          role: data.role,
          active: data.active,
          canOverridePrice: data.canOverridePrice,
          passwordReset: Boolean(data.password),
        },
      });
    });

    revalidatePath("/users");
    revalidatePath("/settings");
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}
