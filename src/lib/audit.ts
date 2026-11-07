import "server-only";
import { Prisma } from "@prisma/client";

type AuditArgs = {
  tx: Prisma.TransactionClient;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
};

export async function writeAudit({
  tx,
  userId,
  action,
  entityType,
  entityId,
  details,
}: AuditArgs): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
      details: details ?? Prisma.JsonNull,
    },
  });
}
