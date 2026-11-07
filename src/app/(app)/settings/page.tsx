import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requirePageAdmin } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await requirePageAdmin();
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, invoice defaults and inventory behaviour."
      />
      <SettingsForm
        initial={{
          address: settings.address ?? "",
          phone: settings.phone ?? "",
          email: settings.email ?? "",
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          invoicePrefix: settings.invoicePrefix,
          defaultTaxRate: Number(settings.defaultTaxRate),
          invoiceFooterNote: settings.invoiceFooterNote ?? "",
          allowNegativeStock: settings.allowNegativeStock,
          logoUrl: settings.logoUrl,
        }}
      />
    </>
  );
}
