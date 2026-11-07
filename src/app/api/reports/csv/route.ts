import { getSessionUser } from "@/lib/permissions";
import { generateReport, isReportType } from "@/lib/reports";
import { toCsv } from "@/lib/csv";
import { COMPANY_SLUG } from "@/lib/constants";
import { sanitizeFileName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type") ?? "sales";
  const type = isReportType(typeParam) ? typeParam : "sales";
  const report = await generateReport(
    type,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined,
  );

  const csv = toCsv(report.columns, report.rows);
  const fileName = sanitizeFileName(
    `${COMPANY_SLUG}-${report.type}-report-${report.range.from}-to-${report.range.to}.csv`,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
