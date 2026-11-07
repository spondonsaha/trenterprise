import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Boxes,
  History,
  Package,
  Pencil,
  Percent,
  RotateCcw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvoiceStatusBadge, StockBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RateDialog } from "@/components/products/rate-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { archiveProduct, restoreProduct } from "@/app/actions/products";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { formatStock, formatStockDetailed, movementSign, stockStatus } from "@/lib/stock-math";
import { MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Product detail",
};

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();
  const canManage = canOverridePrice(user);
  const isAdmin = user.role === "ADMIN";

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      priceHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { changedBy: { select: { name: true } } },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
      invoiceItems: {
        orderBy: { invoice: { date: "desc" } },
        take: 15,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              date: true,
              customerName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!product) notFound();

  const status = stockStatus(product.stockPieces, product.lowStockPieces);
  const stockValue = Number(product.costPrice) * product.stockPieces;
  const margin = Number(product.piecePrice) - Number(product.costPrice);
  const isArchived = product.isArchived;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.brand} · ${product.color} · ${product.sku}${product.category ? ` · ${product.category.name}` : ""}`}
      >
        <Button variant="outline" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Products
          </Link>
        </Button>
        {canManage ? (
          <RateDialog
            product={{
              id: product.id,
              name: product.name,
              sku: product.sku,
              cartonPrice: Number(product.cartonPrice),
              piecePrice: Number(product.piecePrice),
            }}
            trigger={
              <Button variant="outline">
                <Percent className="h-4 w-4" />
                Change rates
              </Button>
            }
          />
        ) : null}
        {canManage ? (
          <Button variant="outline" asChild>
            <Link href={`/products/${product.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        ) : null}
        {isAdmin ? (
          <ConfirmDialog
            trigger={
              <Button variant={isArchived ? "default" : "outline"}>
                {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {isArchived ? "Restore" : "Archive"}
              </Button>
            }
            title={isArchived ? "Restore this product?" : "Archive this product?"}
            description={
              isArchived
                ? `${product.name} will be available again for new invoices.`
                : `${product.name} will be hidden from new invoices but its history is kept. You can restore it later.`
            }
            confirmLabel={isArchived ? "Restore product" : "Archive product"}
            destructive={!isArchived}
            successMessage={isArchived ? "Product restored." : "Product archived."}
            onConfirm={
              isArchived
                ? restoreProduct.bind(null, product.id)
                : archiveProduct.bind(null, product.id)
            }
          />
        ) : null}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <StockBadge pieces={product.stockPieces} lowStockPieces={product.lowStockPieces} />
        {isArchived ? <Badge variant="muted">Archived</Badge> : null}
        {!product.active && !isArchived ? <Badge variant="warning">Inactive</Badge> : null}
        {product.active && !isArchived ? <Badge variant="success">Active</Badge> : null}
        {status === "OUT" ? <Badge variant="danger">Out of stock</Badge> : null}
        {product.category ? <Badge variant="outline">{product.category.name}</Badge> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Carton price"
          value={formatMoney(product.cartonPrice)}
          hint={`${product.piecesPerCarton} pcs per carton`}
          icon={Package}
        />
        <StatCard
          title="Piece price"
          value={formatMoney(product.piecePrice)}
          hint={`Margin ${formatMoney(margin)} per piece`}
          icon={Wallet}
          tone={margin < 0 ? "red" : "teal"}
        />
        <StatCard
          title="Stock on hand"
          value={formatStock(product.stockPieces, product.piecesPerCarton)}
          hint={`${product.stockPieces} pieces · low at ${product.lowStockPieces}`}
          icon={Boxes}
          tone={status === "OUT" ? "red" : status === "LOW" ? "amber" : "green"}
        />
        <StatCard
          title="Stock value"
          value={formatMoney(stockValue)}
          hint="At cost per piece"
          icon={ShoppingCart}
          tone="slate"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                {formatStockDetailed(product.stockPieces, product.piecesPerCarton)} available.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/inventory/adjust?productId=${product.id}`}>Adjust stock</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU</dt>
                <dd className="mt-1 font-medium text-slate-900">{product.sku}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Brand</dt>
                <dd className="mt-1 text-slate-900">{product.brand}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Colour</dt>
                <dd className="mt-1 text-slate-900">{product.color}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Category
                </dt>
                <dd className="mt-1 text-slate-900">{product.category?.name ?? "Uncategorised"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pieces per carton
                </dt>
                <dd className="mt-1 text-slate-900">{product.piecesPerCarton}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cost per piece
                </dt>
                <dd className="mt-1 text-slate-900">{formatMoney(product.costPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Low stock level
                </dt>
                <dd className="mt-1 text-slate-900">{product.lowStockPieces} pieces</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Added
                </dt>
                <dd className="mt-1 text-slate-900">{formatDate(product.createdAt)}</dd>
              </div>
              {product.description ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Description
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-slate-700">{product.description}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock overview</CardTitle>
            <CardDescription>Current position and reorder planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-slate-500">Pieces on hand</span>
              <span className="font-semibold text-slate-900">{product.stockPieces}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-slate-500">Cartons equivalent</span>
              <span className="font-semibold text-slate-900">
                {formatStock(product.stockPieces, product.piecesPerCarton)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-slate-500">Reorder at</span>
              <span className="font-semibold text-slate-900">{product.lowStockPieces} pcs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <StockBadge pieces={product.stockPieces} lowStockPieces={product.lowStockPieces} />
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              Use <span className="font-medium text-slate-700">Adjust stock</span> for corrections,
              or record stock-in from the Inventory page to update cost and quantities together.
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="price-history" className="mt-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 sm:w-auto">
          <TabsTrigger value="price-history">
            <History className="mr-1.5 h-4 w-4" />
            Price history
          </TabsTrigger>
          <TabsTrigger value="stock-ledger">
            <Boxes className="mr-1.5 h-4 w-4" />
            Stock ledger
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Sales history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price-history">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Carton price</th>
                      <th className="px-5 py-3 font-medium">Piece price</th>
                      <th className="px-5 py-3 font-medium">Changed by</th>
                      <th className="px-5 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.priceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                          No price changes recorded yet.
                        </td>
                      </tr>
                    ) : (
                      product.priceHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-slate-400 line-through">
                              {formatMoney(entry.oldCartonPrice)}
                            </span>{" "}
                            <span className="font-medium text-slate-900">
                              {formatMoney(entry.newCartonPrice)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-slate-400 line-through">
                              {formatMoney(entry.oldPiecePrice)}
                            </span>{" "}
                            <span className="font-medium text-slate-900">
                              {formatMoney(entry.newPiecePrice)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-700">{entry.changedBy.name}</td>
                          <td className="px-5 py-3 text-slate-500">{entry.note ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-ledger">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Quantity</th>
                      <th className="px-5 py-3 font-medium">Pieces</th>
                      <th className="px-5 py-3 font-medium">Reference</th>
                      <th className="px-5 py-3 font-medium">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.stockMovements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                          No stock movements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      product.stockMovements.map((movement) => {
                        const sign = movementSign(movement.type);
                        return (
                          <tr key={movement.id}>
                            <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                              {formatDate(movement.createdAt)}
                            </td>
                            <td className="px-5 py-3">
                              <Badge
                                variant={
                                  sign > 0 ? "success" : movement.type === "ADJUSTMENT" ? "warning" : "danger"
                                }
                              >
                                {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-900">
                              {sign > 0 ? "+" : "−"}
                              {movement.quantity} {movement.unit === "CARTON" ? "ctn" : "pcs"}
                            </td>
                            <td className="px-5 py-3 text-slate-700">
                              {sign > 0 ? "+" : "−"}
                              {movement.quantityPieces}
                            </td>
                            <td className="px-5 py-3 text-slate-500">
                              {movement.note ??
                                (movement.referenceType
                                  ? `${movement.referenceType}${movement.referenceId ? ` #${movement.referenceId.slice(-6)}` : ""}`
                                  : "—")}
                            </td>
                            <td className="px-5 py-3 text-slate-700">{movement.user.name}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Invoice</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Quantity</th>
                      <th className="px-5 py-3 font-medium">Unit price</th>
                      <th className="px-5 py-3 text-right font-medium">Line total</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.invoiceItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                          This product has not been invoiced yet.
                        </td>
                      </tr>
                    ) : (
                      product.invoiceItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-5 py-3">
                            <Link
                              href={`/invoices/${item.invoice.id}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              {item.invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td className="max-w-[180px] truncate px-5 py-3 text-slate-700">
                            {item.invoice.customerName}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                            {formatDate(item.invoice.date)}
                          </td>
                          <td className="px-5 py-3 text-slate-700">
                            {item.quantity} {item.unit === "CARTON" ? "ctn" : "pcs"}
                          </td>
                          <td className="px-5 py-3 text-slate-700">{formatMoney(item.unitPrice)}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-900">
                            {formatMoney(item.lineTotal)}
                          </td>
                          <td className="px-5 py-3">
                            <InvoiceStatusBadge status={item.invoice.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
