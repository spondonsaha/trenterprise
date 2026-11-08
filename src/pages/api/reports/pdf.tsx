import { renderToBuffer } from "@react-pdf/renderer";
import type { NextApiRequest, NextApiResponse } from "next";
import { getApiSessionUser } from "@/lib/api-auth";
import { withPdfErrorHandling } from "@/lib/pdf-api";
import { generateReport, isReportType } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { ReportPdf, type ReportPdfData } from "@/lib/pdf/report-pdf";
import { COMPANY_SLUG } from "@/lib/constants";
import { formatDateTime, sanitizeFileName } from "@/lib/utils";

export const config = {
  api: { responseLimit: false },
};

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const user = await getApiSessionUser(req, res);
  if (!user) return res.status(401).send("Unauthorized");

  const typeParam = queryValue(req.query.type) ?? "sales";
  const type = isReportType(typeParam) ? typeParam : "sales";
  const report = await generateReport(
    type,
    queryValue(req.query.from),
    queryValue(req.query.to),
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

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(Buffer.from(buffer));
}

export default withPdfErrorHandling(handler);
