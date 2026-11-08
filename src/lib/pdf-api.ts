import type { NextApiHandler } from "next";

export function withPdfErrorHandling(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("[pdf]", error);
      if (res.headersSent) {
        res.end();
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      const isProduction = process.env.VERCEL_ENV === "production";
      res.status(500).json({
        error: isProduction ? "Failed to generate PDF" : message,
        ...(isProduction
          ? {}
          : { stack: error instanceof Error ? error.stack : undefined }),
      });
    }
  };
}
