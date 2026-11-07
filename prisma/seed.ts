import {
  DiscountType,
  InvoiceStatus,
  MovementType,
  PaymentMethod,
  Prisma,
  PrismaClient,
  Role,
  Unit,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { COMPANY_NAME, DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL, DEFAULT_INVOICE_PREFIX } from "../src/lib/constants";

const prisma = new PrismaClient();
const D = (value: number | string | Prisma.Decimal) => new Prisma.Decimal(value);
const money = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

type SeedProduct = {
  key: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  color: string;
  description: string;
  piecesPerCarton: number;
  cartonPrice: number;
  piecePrice: number;
  costPerCarton: number;
  lowStockPieces: number;
  openingCartons: number;
  openingPieces: number;
};

const products: SeedProduct[] = [
  {
    key: "hp415a-bk",
    name: "HP 415A Black Toner",
    sku: "HP-415A-BK",
    category: "Toner Cartridges",
    brand: "HP",
    color: "Black",
    description: "Original HP 415A black laser toner cartridge for Color LaserJet Pro M454 / MFP M479.",
    piecesPerCarton: 12,
    cartonPrice: 42000,
    piecePrice: 3600,
    costPerCarton: 30000,
    lowStockPieces: 24,
    openingCartons: 20,
    openingPieces: 0,
  },
  {
    key: "hp415a-c",
    name: "HP 415A Cyan Toner",
    sku: "HP-415A-C",
    category: "Toner Cartridges",
    brand: "HP",
    color: "Cyan",
    description: "Original HP 415A cyan laser toner cartridge.",
    piecesPerCarton: 12,
    cartonPrice: 42000,
    piecePrice: 3600,
    costPerCarton: 30000,
    lowStockPieces: 24,
    openingCartons: 8,
    openingPieces: 0,
  },
  {
    key: "hp415a-m",
    name: "HP 415A Magenta Toner",
    sku: "HP-415A-M",
    category: "Toner Cartridges",
    brand: "HP",
    color: "Magenta",
    description: "Original HP 415A magenta laser toner cartridge.",
    piecesPerCarton: 12,
    cartonPrice: 42000,
    piecePrice: 3600,
    costPerCarton: 30000,
    lowStockPieces: 24,
    openingCartons: 6,
    openingPieces: 0,
  },
  {
    key: "hp415a-y",
    name: "HP 415A Yellow Toner",
    sku: "HP-415A-Y",
    category: "Toner Cartridges",
    brand: "HP",
    color: "Yellow",
    description: "Original HP 415A yellow laser toner cartridge.",
    piecesPerCarton: 12,
    cartonPrice: 42000,
    piecePrice: 3600,
    costPerCarton: 30000,
    lowStockPieces: 24,
    openingCartons: 5,
    openingPieces: 0,
  },
  {
    key: "canon052",
    name: "Canon 052 Black Toner",
    sku: "CN-052-BK",
    category: "Toner Cartridges",
    brand: "Canon",
    color: "Black",
    description: "Canon Cartridge 052 black toner for imageCLASS LBP212dw / MF421dw.",
    piecesPerCarton: 12,
    cartonPrice: 38000,
    piecePrice: 3200,
    costPerCarton: 27000,
    lowStockPieces: 24,
    openingCartons: 9,
    openingPieces: 0,
  },
  {
    key: "canon054",
    name: "Canon 054 Black Toner",
    sku: "CN-054-BK",
    category: "Toner Cartridges",
    brand: "Canon",
    color: "Black",
    description: "Canon Cartridge 054 black toner for imageCLASS LBP620 series.",
    piecesPerCarton: 6,
    cartonPrice: 55000,
    piecePrice: 9700,
    costPerCarton: 40000,
    lowStockPieces: 24,
    openingCartons: 1,
    openingPieces: 8,
  },
  {
    key: "brother269-bk",
    name: "Brother TN-269 Black Toner",
    sku: "BR-TN269-BK",
    category: "Toner Cartridges",
    brand: "Brother",
    color: "Black",
    description: "Brother TN-269 black toner cartridge, high yield.",
    piecesPerCarton: 12,
    cartonPrice: 36000,
    piecePrice: 3100,
    costPerCarton: 25000,
    lowStockPieces: 24,
    openingCartons: 7,
    openingPieces: 0,
  },
  {
    key: "brother269-c",
    name: "Brother TN-269 Cyan Toner",
    sku: "BR-TN269-C",
    category: "Toner Cartridges",
    brand: "Brother",
    color: "Cyan",
    description: "Brother TN-269 cyan toner cartridge.",
    piecesPerCarton: 12,
    cartonPrice: 36000,
    piecePrice: 3100,
    costPerCarton: 25000,
    lowStockPieces: 24,
    openingCartons: 4,
    openingPieces: 0,
  },
  {
    key: "hp85a",
    name: "HP 85A Black Toner",
    sku: "HP-85A-BK",
    category: "Toner Cartridges",
    brand: "HP",
    color: "Black",
    description: "Original HP 85A black toner cartridge for LaserJet P1102 / M1212.",
    piecesPerCarton: 12,
    cartonPrice: 35000,
    piecePrice: 3000,
    costPerCarton: 24000,
    lowStockPieces: 24,
    openingCartons: 6,
    openingPieces: 0,
  },
  {
    key: "epson003-bk",
    name: "Epson 003 Black Ink Bottle",
    sku: "EP-003-BK",
    category: "Ink Bottles",
    brand: "Epson",
    color: "Black",
    description: "Epson 003 genuine black ink bottle, 65 ml.",
    piecesPerCarton: 24,
    cartonPrice: 14400,
    piecePrice: 650,
    costPerCarton: 11000,
    lowStockPieces: 48,
    openingCartons: 15,
    openingPieces: 0,
  },
  {
    key: "epson003-c",
    name: "Epson 003 Cyan Ink Bottle",
    sku: "EP-003-C",
    category: "Ink Bottles",
    brand: "Epson",
    color: "Cyan",
    description: "Epson 003 genuine cyan ink bottle, 65 ml.",
    piecesPerCarton: 24,
    cartonPrice: 14400,
    piecePrice: 650,
    costPerCarton: 11000,
    lowStockPieces: 48,
    openingCartons: 10,
    openingPieces: 0,
  },
  {
    key: "epson003-m",
    name: "Epson 003 Magenta Ink Bottle",
    sku: "EP-003-M",
    category: "Ink Bottles",
    brand: "Epson",
    color: "Magenta",
    description: "Epson 003 genuine magenta ink bottle, 65 ml.",
    piecesPerCarton: 24,
    cartonPrice: 14400,
    piecePrice: 650,
    costPerCarton: 11000,
    lowStockPieces: 48,
    openingCartons: 9,
    openingPieces: 0,
  },
  {
    key: "epson003-y",
    name: "Epson 003 Yellow Ink Bottle",
    sku: "EP-003-Y",
    category: "Ink Bottles",
    brand: "Epson",
    color: "Yellow",
    description: "Epson 003 genuine yellow ink bottle, 65 ml.",
    piecesPerCarton: 24,
    cartonPrice: 14400,
    piecePrice: 650,
    costPerCarton: 11000,
    lowStockPieces: 48,
    openingCartons: 8,
    openingPieces: 0,
  },
  {
    key: "hpgt53",
    name: "HP GT53 Black Ink Bottle",
    sku: "HP-GT53-BK",
    category: "Ink Bottles",
    brand: "HP",
    color: "Black",
    description: "HP GT53 original black ink bottle, 90 ml.",
    piecesPerCarton: 24,
    cartonPrice: 13200,
    piecePrice: 580,
    costPerCarton: 9800,
    lowStockPieces: 48,
    openingCartons: 7,
    openingPieces: 0,
  },
  {
    key: "hp680",
    name: "HP 680 Black Ink Cartridge",
    sku: "HP-680-BK",
    category: "Ink Cartridges & Refills",
    brand: "HP",
    color: "Black",
    description: "HP 680 original black ink cartridge for DeskJet Ink Advantage.",
    piecesPerCarton: 24,
    cartonPrice: 16800,
    piecePrice: 750,
    costPerCarton: 12500,
    lowStockPieces: 24,
    openingCartons: 0,
    openingPieces: 0,
  },
];

async function createOpeningStock(
  productId: string,
  piecesPerCarton: number,
  cartons: number,
  pieces: number,
  userId: string,
  createdAt: Date,
) {
  if (cartons > 0) {
    await prisma.stockMovement.create({
      data: {
        productId,
        type: MovementType.OPENING,
        quantity: cartons,
        unit: Unit.CARTON,
        quantityPieces: cartons * piecesPerCarton,
        referenceType: "OPENING",
        note: "Opening stock",
        userId,
        createdAt,
      },
    });
  }
  if (pieces > 0) {
    await prisma.stockMovement.create({
      data: {
        productId,
        type: MovementType.OPENING,
        quantity: pieces,
        unit: Unit.PIECE,
        quantityPieces: pieces,
        referenceType: "OPENING",
        note: "Opening stock",
        userId,
        createdAt,
      },
    });
  }
  await prisma.product.update({
    where: { id: productId },
    data: { stockPieces: cartons * piecesPerCarton + pieces },
  });
}

type SeedLine = {
  productId: string;
  description: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  piecesPerCarton: number;
  productName: string;
};

async function createInvoice(args: {
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  date: Date;
  dueDate?: Date;
  lines: SeedLine[];
  notes?: string;
  terms?: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  shipping?: number;
  isQuick?: boolean;
  manualTotal?: number;
  userId: string;
}) {
  const isQuick = args.isQuick ?? false;
  const subtotal = args.lines.reduce(
    (sum, line) => sum.add(D(line.unitPrice).mul(line.quantity)),
    D(0),
  );
  const discountValue = D(args.discountValue ?? 0);
  let discountAmount = D(0);
  if (discountValue.gt(0)) {
    discountAmount =
      args.discountType === DiscountType.PERCENT
        ? subtotal.mul(discountValue).div(100)
        : discountValue;
  }
  const taxRate = D(args.taxRate ?? 0);
  const shipping = D(args.shipping ?? 0);
  const taxable = subtotal.sub(discountAmount);
  const taxAmount = taxable.mul(taxRate).div(100);
  const computedTotal = taxable.add(taxAmount).add(shipping);
  const total = money(isQuick ? D(args.manualTotal ?? 0) : computedTotal);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: args.invoiceNumber,
      customerId: args.customerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerAddress: args.customerAddress,
      date: args.date,
      dueDate: args.dueDate,
      status: InvoiceStatus.UNPAID,
      isQuick,
      stockPosted: !isQuick && args.lines.length > 0,
      subtotal: money(subtotal),
      discountType: args.discountType ?? DiscountType.AMOUNT,
      discountValue: money(discountValue),
      discountAmount: money(discountAmount),
      taxRate,
      taxAmount: money(taxAmount),
      shipping: money(shipping),
      total,
      paidAmount: money(0),
      dueAmount: total,
      notes: args.notes,
      terms: args.terms,
      createdById: args.userId,
      createdAt: args.date,
      items: {
        create: args.lines.map((line) => ({
          productId: line.productId,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: money(D(line.unitPrice)),
          piecesPerCarton: line.piecesPerCarton,
          quantityPieces:
            line.unit === Unit.CARTON
              ? line.quantity * line.piecesPerCarton
              : line.quantity,
          lineTotal: money(D(line.unitPrice).mul(line.quantity)),
        })),
      },
    },
  });

  if (!isQuick) {
    for (const line of args.lines) {
      const pieces =
        line.unit === Unit.CARTON ? line.quantity * line.piecesPerCarton : line.quantity;
      const updated = await prisma.product.update({
        where: { id: line.productId },
        data: { stockPieces: { decrement: pieces } },
      });
      if (updated.stockPieces < 0) {
        throw new Error(`Seed invoice would make ${line.productName} negative.`);
      }
      await prisma.stockMovement.create({
        data: {
          productId: line.productId,
          type: MovementType.SALE,
          quantity: line.quantity,
          unit: line.unit,
          quantityPieces: -pieces,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          note: `Sold on ${args.invoiceNumber}`,
          userId: args.userId,
          createdAt: args.date,
        },
      });
    }
  }

  return invoice;
}

async function recordSeededPayment(args: {
  receiptNumber: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  date: Date;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  userId: string;
}) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: args.invoiceId } });
  const amount = D(args.amount);
  const paid = D(invoice.paidAmount).add(amount);
  const total = D(invoice.total);
  if (paid.gt(total)) {
    throw new Error("Seed payment would overpay the invoice.");
  }
  const due = total.sub(paid);
  const status = due.lte(0) ? InvoiceStatus.PAID : paid.gt(0) ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID;

  await prisma.payment.create({
    data: {
      receiptNumber: args.receiptNumber,
      invoiceId: args.invoiceId,
      customerId: args.customerId,
      amount: amount.toDecimalPlaces(2),
      date: args.date,
      method: args.method,
      reference: args.reference,
      note: args.note,
      createdById: args.userId,
      createdAt: args.date,
    },
  });
  await prisma.invoice.update({
    where: { id: args.invoiceId },
    data: { paidAmount: paid.toDecimalPlaces(2), dueAmount: due.toDecimalPlaces(2), status },
  });
}

async function main() {
  console.log("Seeding TR Enterprise ERP...");

  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.sequence.deleteMany();

  const passwordHash = await bcrypt.hash("REDACTED", 10);
  const staffHash = await bcrypt.hash("REDACTED", 10);

  const admin = await prisma.user.create({
    data: {
      name: "TR Enterprise Admin",
      email: "admin@trenterprise.com",
      passwordHash,
      role: Role.ADMIN,
      canOverridePrice: true,
    },
  });
  const staff = await prisma.user.create({
    data: {
      name: "REDACTED",
      email: "staff@trenterprise.com",
      passwordHash: staffHash,
      role: Role.STAFF,
      canOverridePrice: false,
    },
  });

  await prisma.setting.create({
    data: {
      id: "singleton",
      companyName: COMPANY_NAME,
      address: "REDACTED",
      phone: "REDACTED",
      email: "REDACTED",
      currency: DEFAULT_CURRENCY,
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      invoicePrefix: DEFAULT_INVOICE_PREFIX,
      defaultTaxRate: 0,
      invoiceFooterNote: "Thank you for choosing TR Enterprise. Goods sold are not returnable after 7 days.",
      allowNegativeStock: false,
    },
  });

  const categoryNames = ["Toner Cartridges", "Ink Bottles", "Ink Cartridges & Refills"];
  const categoryMap = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await prisma.category.create({
      data: {
        name,
        description: `${name} for laser and inkjet printers.`,
      },
    });
    categoryMap.set(name, category.id);
  }

  const productMap = new Map<string, { id: string; name: string; piecesPerCarton: number }>();
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        sku: product.sku,
        categoryId: categoryMap.get(product.category),
        brand: product.brand,
        color: product.color,
        description: product.description,
        piecesPerCarton: product.piecesPerCarton,
        cartonPrice: money(D(product.cartonPrice)),
        piecePrice: money(D(product.piecePrice)),
        costPrice: D(product.costPerCarton).div(product.piecesPerCarton).toDecimalPlaces(4),
        lowStockPieces: product.lowStockPieces,
      },
    });
    productMap.set(product.key, {
      id: created.id,
      name: created.name,
      piecesPerCarton: created.piecesPerCarton,
    });
    await createOpeningStock(
      created.id,
      product.piecesPerCarton,
      product.openingCartons,
      product.openingPieces,
      admin.id,
      daysAgo(60),
    );
  }

  const customerRahman = await prisma.customer.create({
    data: {
      name: "Rahman Traders",
      contactPerson: "Md. Ashikur Rahman",
      phone: "01711-000001",
      email: "accounts@rahmantraders.example",
      address: "12 Kazi Nazrul Avenue, Banglamotor, Dhaka 1000",
      notes: "Regular buyer of HP toner cartridges.",
    },
  });
  const customerMetro = await prisma.customer.create({
    data: {
      name: "Metro Stationery",
      contactPerson: "Farhana Akter",
      phone: "01711-000002",
      email: "orders@metrostationery.example",
      address: "45 New Market Road, Dhaka 1205",
      openingBalance: D(2500),
    },
  });
  const customerGreen = await prisma.customer.create({
    data: {
      name: "Green Office Solutions",
      contactPerson: "Tanvir Hasan",
      phone: "01711-000003",
      email: "tanvir@greenoffice.example",
      address: "House 9, Road 3, Banani, Dhaka 1213",
    },
  });
  const customerCity = await prisma.customer.create({
    data: {
      name: "City Copier House",
      contactPerson: "Nasir Uddin",
      phone: "01711-000004",
      email: "citycopier@example.com",
      address: "7 Elephant Road, Dhaka 1205",
      openingBalance: D(12000),
    },
  });
  await prisma.customer.create({
    data: {
      name: "Prime Printers",
      contactPerson: "Shafiq Ahmed",
      phone: "01711-000005",
      email: "hello@primeprinters.example",
      address: "22 Malibagh Chowdhury Para, Dhaka 1219",
    },
  });

  const supplierA = await prisma.supplier.create({
    data: {
      name: "PrintPoint Distributors",
      contactPerson: "Rezaul Karim",
      phone: "01811-000001",
      email: "sales@printpoint.example",
      address: "Shop 230, Bashundhara City, Dhaka",
    },
  });
  await prisma.supplier.create({
    data: {
      name: "Dhaka Office Supplies",
      contactPerson: "Mizanur Rahman",
      phone: "01811-000002",
      email: "info@dhakaoffice.example",
      address: "15 Purana Paltan, Dhaka 1000",
    },
  });

  await prisma.priceHistory.createMany({
    data: [
      {
        productId: productMap.get("hp415a-bk")!.id,
        oldCartonPrice: money(D(40000)),
        newCartonPrice: money(D(42000)),
        oldPiecePrice: money(D(3450)),
        newPiecePrice: money(D(3600)),
        note: "Supplier price increase",
        changedById: admin.id,
        createdAt: daysAgo(20),
      },
      {
        productId: productMap.get("canon052")!.id,
        oldCartonPrice: money(D(36000)),
        newCartonPrice: money(D(38000)),
        oldPiecePrice: money(D(3050)),
        newPiecePrice: money(D(3200)),
        note: "New distributor landed cost",
        changedById: admin.id,
        createdAt: daysAgo(12),
      },
    ],
  });

  const purchaseDate = daysAgo(25);
  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber: "PO-0001",
      supplierId: supplierA.id,
      purchaseDate,
      referenceNumber: "PP-INV-7781",
      note: "Restock of fast-moving HP and Epson items.",
      totalCost: money(D(355000)),
      createdById: admin.id,
      createdAt: purchaseDate,
      items: {
        create: [
          {
            productId: productMap.get("hp415a-bk")!.id,
            productName: productMap.get("hp415a-bk")!.name,
            quantity: 10,
            unit: Unit.CARTON,
            quantityPieces: 120,
            unitCost: D(30000),
            lineTotal: money(D(300000)),
          },
          {
            productId: productMap.get("epson003-bk")!.id,
            productName: productMap.get("epson003-bk")!.name,
            quantity: 5,
            unit: Unit.CARTON,
            quantityPieces: 120,
            unitCost: D(11000),
            lineTotal: money(D(55000)),
          },
        ],
      },
    },
  });

  for (const item of [
    { key: "hp415a-bk", cartons: 10, costPerPiece: 2500 },
    { key: "epson003-bk", cartons: 5, costPerPiece: D(11000).div(24).toDecimalPlaces(4) },
  ]) {
    const product = productMap.get(item.key)!;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        stockPieces: { increment: item.cartons * product.piecesPerCarton },
        costPrice: item.costPerPiece,
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: MovementType.STOCK_IN,
        quantity: item.cartons,
        unit: Unit.CARTON,
        quantityPieces: item.cartons * product.piecesPerCarton,
        unitCost: item.costPerPiece,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        note: "Purchase PO-0001",
        userId: admin.id,
        createdAt: purchaseDate,
      },
    });
  }

  const invoice1 = await createInvoice({
    invoiceNumber: "INV-0001",
    customerId: customerRahman.id,
    customerName: customerRahman.name,
    customerPhone: customerRahman.phone ?? undefined,
    customerAddress: customerRahman.address ?? undefined,
    date: daysAgo(10),
    dueDate: daysAgo(5),
    lines: [
      {
        productId: productMap.get("hp415a-bk")!.id,
        description: "HP 415A Black Toner (Carton)",
        unit: Unit.CARTON,
        quantity: 2,
        unitPrice: 42000,
        piecesPerCarton: 12,
        productName: "HP 415A Black Toner",
      },
      {
        productId: productMap.get("epson003-bk")!.id,
        description: "Epson 003 Black Ink Bottle (Piece)",
        unit: Unit.PIECE,
        quantity: 10,
        unitPrice: 650,
        piecesPerCarton: 24,
        productName: "Epson 003 Black Ink Bottle",
      },
    ],
    notes: "Delivered to Banglamotor branch.",
    terms: "Payment within 15 days.",
    discountType: DiscountType.AMOUNT,
    discountValue: 500,
    userId: staff.id,
  });

  const invoice2 = await createInvoice({
    invoiceNumber: "INV-0002",
    customerId: customerMetro.id,
    customerName: customerMetro.name,
    customerPhone: customerMetro.phone ?? undefined,
    customerAddress: customerMetro.address ?? undefined,
    date: daysAgo(1),
    dueDate: daysFromNow(14),
    lines: [],
    isQuick: true,
    manualTotal: 15000,
    notes: "Monthly consumables supply - quick invoice.",
    userId: staff.id,
  });

  const invoice3 = await createInvoice({
    invoiceNumber: "INV-0003",
    customerId: customerGreen.id,
    customerName: customerGreen.name,
    customerPhone: customerGreen.phone ?? undefined,
    customerAddress: customerGreen.address ?? undefined,
    date: daysAgo(3),
    dueDate: daysFromNow(12),
    lines: [
      {
        productId: productMap.get("canon052")!.id,
        description: "Canon 052 Black Toner (Carton)",
        unit: Unit.CARTON,
        quantity: 1,
        unitPrice: 38000,
        piecesPerCarton: 12,
        productName: "Canon 052 Black Toner",
      },
      {
        productId: productMap.get("hp85a")!.id,
        description: "HP 85A Black Toner (Piece)",
        unit: Unit.PIECE,
        quantity: 3,
        unitPrice: 3000,
        piecesPerCarton: 12,
        productName: "HP 85A Black Toner",
      },
    ],
    discountType: DiscountType.PERCENT,
    discountValue: 5,
    shipping: 200,
    terms: "Payment on delivery.",
    userId: staff.id,
  });

  await recordSeededPayment({
    receiptNumber: "RCPT-0001",
    invoiceId: invoice1.id,
    customerId: customerRahman.id,
    amount: 40000,
    date: daysAgo(4),
    method: PaymentMethod.BANK_TRANSFER,
    reference: "TRX-88231",
    note: "Partial payment via City Bank.",
    userId: admin.id,
  });
  await recordSeededPayment({
    receiptNumber: "RCPT-0002",
    invoiceId: invoice3.id,
    customerId: customerGreen.id,
    amount: 44850,
    date: daysAgo(2),
    method: PaymentMethod.CASH,
    note: "Paid in full.",
    userId: staff.id,
  });
  await recordSeededPayment({
    receiptNumber: "RCPT-0003",
    invoiceId: invoice1.id,
    customerId: customerRahman.id,
    amount: 10000,
    date: daysAgo(1),
    method: PaymentMethod.MOBILE_BANKING,
    reference: "BKASH-771209",
    note: "bKash balance payment.",
    userId: staff.id,
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "RATE_CHANGE",
        entityType: "Product",
        entityId: productMap.get("hp415a-bk")!.id,
        details: {
          oldCartonPrice: 40000,
          newCartonPrice: 42000,
          oldPiecePrice: 3450,
          newPiecePrice: 3600,
          note: "Supplier price increase",
        },
        createdAt: daysAgo(20),
      },
      {
        userId: staff.id,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice3.id,
        details: { invoiceNumber: "INV-0003", total: 44850 },
        createdAt: daysAgo(3),
      },
      {
        userId: staff.id,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: "RCPT-0002",
        details: { invoiceNumber: "INV-0003", amount: 44850 },
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.sequence.createMany({
    data: [
      { key: "invoice", value: 3 },
      { key: "receipt", value: 3 },
      { key: "purchase", value: 1 },
    ],
  });

  console.log(`Seeded ${products.length} products, 5 customers and 3 invoices.`);
  console.log(`Admin login: admin@trenterprise.com / REDACTED`);
  console.log(`Staff login: staff@trenterprise.com / REDACTED`);
  console.log(`Invoices: ${invoice1.invoiceNumber}, ${invoice2.invoiceNumber}, ${invoice3.invoiceNumber}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
