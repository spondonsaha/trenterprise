"use server";

import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";

export type SearchResultGroup = "products" | "customers" | "invoices" | "payments";

export type SearchResult = {
  id: string;
  group: SearchResultGroup;
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  await requireActionUser();

  const q = query.trim();
  if (q.length < 2) return [];

  const [products, customers, invoices, payments] = await Promise.all([
    prisma.product.findMany({
      where: {
        isArchived: false,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 5,
      select: { id: true, name: true, sku: true, brand: true },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 5,
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, invoiceNumber: true, customerName: true, total: true },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { receiptNumber: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        invoice: { select: { id: true, invoiceNumber: true, customerName: true } },
      },
    }),
  ]);

  return [
    ...products.map((product) => ({
      id: product.id,
      group: "products" as const,
      title: product.name,
      subtitle: [product.brand, product.sku].filter(Boolean).join(" · "),
      href: `/products/${product.id}`,
    })),
    ...customers.map((customer) => ({
      id: customer.id,
      group: "customers" as const,
      title: customer.name,
      subtitle: [customer.phone, customer.email].filter(Boolean).join(" · "),
      href: `/customers/${customer.id}`,
    })),
    ...invoices.map((invoice) => ({
      id: invoice.id,
      group: "invoices" as const,
      title: invoice.invoiceNumber,
      subtitle: `${invoice.customerName} · ${formatMoney(invoice.total)}`,
      href: `/invoices/${invoice.id}`,
    })),
    ...payments.map((payment) => ({
      id: payment.id,
      group: "payments" as const,
      title: payment.receiptNumber,
      subtitle: `${payment.invoice.customerName} · ${formatMoney(payment.amount)}`,
      href: `/invoices/${payment.invoice.id}`,
    })),
  ];
}
