import "server-only";
import type { Prisma } from "@prisma/client";

export async function nextSequence(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" ("key", "value", "updatedAt")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key")
    DO UPDATE SET "value" = "Sequence"."value" + 1, "updatedAt" = NOW()
    RETURNING "value"
  `;
  return rows[0]?.value ?? 1;
}

export function formatSequence(prefix: string, value: number): string {
  return `${prefix}${String(value).padStart(4, "0")}`;
}
