import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/permissions";
import { generateReport, isReportType } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { ReportPdf, type ReportPdfData } from "@/lib/pdf/report-pdf";
import { COMPANY_SLUG } from "@/lib/constants";
import { formatDateTime, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const settings = await getSettings();

  const data: ReportPdfData = {
    title: report.title,
    subtitle: report.subtitle,
    generatedLabel: formatDateTime(new Date()),
    columns: report.columns.map((column) => ({
      label: column.label,
      width: column.width,
      align: column.align,
    })),
    rows: report.rows.map((row) => report.columns.map((column) => row[column.key] ?? "")),
    summary: report.summary,
    company: {
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
    },
  };

  const buffer = await renderToBuffer(<ReportPdf data={data} />);
  const fileName = sanitizeFileName(
    `${COMPANY_SLUG}-${report.type}-report-${report.range.from}-to-${report.range.to}.pdf`,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
