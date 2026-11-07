"use client";

import { Power } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { setCustomerActive } from "@/app/actions/customers";

export function CustomerActiveToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  return (
    <ConfirmDialog
      title={active ? "Deactivate customer?" : "Activate customer?"}
      description={
        active
          ? "The customer will keep all invoices and ledger history, but will be hidden when creating new invoices."
          : "The customer will become available again when creating new invoices."
      }
      confirmLabel={active ? "Deactivate" : "Activate"}
      destructive={active}
      successMessage={active ? "Customer deactivated." : "Customer activated."}
      onConfirm={() => setCustomerActive(id, !active)}
      trigger={
        <Button variant="outline" size="sm">
          <Power className="h-3.5 w-3.5" />
          {active ? "Deactivate" : "Activate"}
        </Button>
      }
    />
  );
}
