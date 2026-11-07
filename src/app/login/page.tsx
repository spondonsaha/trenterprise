import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boxes, FileText, Printer, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { COMPANY_NAME } from "@/lib/constants";
import { getSessionUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${COMPANY_NAME} ERP to manage invoices, stock and receivables.`,
};

const FEATURES = [
  {
    icon: FileText,
    title: "Invoices & dues",
    description: "Itemized or quick invoices, payments and ageing receivables.",
  },
  {
    icon: Boxes,
    title: "Carton-level stock",
    description: "Track every cartridge by carton and piece with a full ledger.",
  },
  {
    icon: Printer,
    title: "Print-ready documents",
    description: "Branded invoice, receipt and report PDFs generated on the server.",
  },
];

export default async function LoginPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const callbackUrl =
    searchParams.callbackUrl && searchParams.callbackUrl.startsWith("/")
      ? searchParams.callbackUrl
      : "/dashboard";

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0B1B2B] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(20,184,166,0.22), transparent 42%), radial-gradient(circle at 85% 80%, rgba(29,78,216,0.28), transparent 45%)",
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-brand-600 text-base font-black shadow-lg shadow-teal-900/40">
              TR
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">{COMPANY_NAME}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                Ink · Toner · Cartridge ERP
              </p>
            </div>
          </div>

          <h1 className="mt-16 max-w-xl text-4xl font-bold leading-tight tracking-tight text-balance">
            Every cartridge, invoice and payment — in one place.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Purpose-built for {COMPANY_NAME}&apos;s printer ink, toner and cartridge business.
            Sell by carton or piece, keep stock accurate and never lose sight of a due.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{feature.title}</span>
                    <span className="block text-xs leading-relaxed text-slate-400">
                      {feature.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-teal-400" />
          Secure credentials sign-in with role-based access.
        </div>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-brand-600 text-sm font-black text-white">
              TR
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">{COMPANY_NAME}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                ERP
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            {COMPANY_NAME}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use the credentials provided by your administrator. Sessions expire after 8 hours.
          </p>

          <div className="mt-8">
            <LoginForm
              callbackUrl={callbackUrl}
              demo={process.env.NODE_ENV !== "production"}
            />
          </div>

          <p className="mt-8 border-t border-border pt-5 text-center text-[11px] leading-relaxed text-slate-500">
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
            <br />
            Need access? Contact an administrator to create your account.
          </p>
        </div>
      </section>
    </main>
  );
}
