"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import { requireActionAdmin } from "@/lib/permissions";
import { settingSchema, type SettingInput } from "@/lib/validation";
import { D, round2 } from "@/lib/money";
import { COMPANY_NAME } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";

export async function updateSettings(input: SettingInput): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionAdmin();
    const data = settingSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findUnique({ where: { id: "singleton" } });
      const logoUrl =
        data.logoUrl === undefined
          ? existing?.logoUrl ?? null
          : data.logoUrl.trim() === ""
            ? null
            : data.logoUrl;

      await tx.setting.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          companyName: COMPANY_NAME,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          invoicePrefix: data.invoicePrefix,
          defaultTaxRate: round2(D(data.defaultTaxRate)),
          invoiceFooterNote: data.invoiceFooterNote || null,
          logoUrl,
          allowNegativeStock: data.allowNegativeStock,
        },
        update: {
          companyName: COMPANY_NAME,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          invoicePrefix: data.invoicePrefix,
          defaultTaxRate: round2(D(data.defaultTaxRate)),
          invoiceFooterNote: data.invoiceFooterNote || null,
          logoUrl,
          allowNegativeStock: data.allowNegativeStock,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "SETTINGS_UPDATED",
        entityType: "Setting",
        entityId: "singleton",
        details: {
          currency: data.currency,
          invoicePrefix: data.invoicePrefix,
          defaultTaxRate: data.defaultTaxRate,
          allowNegativeStock: data.allowNegativeStock,
          logoChanged: logoUrl !== (existing?.logoUrl ?? null),
        },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
