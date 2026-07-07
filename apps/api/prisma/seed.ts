import * as dotenv from "dotenv";
dotenv.config();

import {
  PrismaClient, Role, UnitType, MovementType, POStatus, PaymentType,
  DealerOrderStatus, PaymentStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  const [admin, manager, staff] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@liquorerp.com" },
      update: {},
      create: { email: "admin@liquorerp.com", name: "Admin User", passwordHash: await bcrypt.hash("admin1234", 12), role: Role.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: "manager@liquorerp.com" },
      update: {},
      create: { email: "manager@liquorerp.com", name: "Store Manager", passwordHash: await bcrypt.hash("manager1234", 12), role: Role.MANAGER },
    }),
    prisma.user.upsert({
      where: { email: "staff@liquorerp.com" },
      update: {},
      create: { email: "staff@liquorerp.com", name: "Sales Staff", passwordHash: await bcrypt.hash("staff1234", 12), role: Role.STAFF },
    }),
  ]);
  console.log("✅ Users: admin, manager, staff");

  // ── Categories ─────────────────────────────────────────────────────────────
  const catDefs = [
    { name: "Whiskey", slug: "whiskey", color: "#92400e" },
    { name: "Vodka",   slug: "vodka",   color: "#1e40af" },
    { name: "Beer",    slug: "beer",    color: "#d97706" },
    { name: "Wine",    slug: "wine",    color: "#7c3aed" },
    { name: "Rum",     slug: "rum",     color: "#7f1d1d" },
    { name: "Gin",     slug: "gin",     color: "#14532d" },
  ];
  const cats = await Promise.all(
    catDefs.map(c => prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }))
  );
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c]));
  console.log("✅ Categories:", cats.map(c => c.name).join(", "));

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const supplierDefs = [
    { id: "sup-001", name: "Premium Beverages Ltd", contactPerson: "Raj Kumar",    email: "raj@premiumbev.com",    phone: "+91-9876543210", avgLeadDays: 3 },
    { id: "sup-002", name: "Allied Distributors",   contactPerson: "Meera Singh",  email: "meera@allied.com",      phone: "+91-9123456789", avgLeadDays: 5 },
    { id: "sup-003", name: "City Wines & Spirits",  contactPerson: "Arjun Patel",  email: "arjun@citywines.in",    phone: "+91-9988776655", avgLeadDays: 2 },
    { id: "sup-004", name: "Metro Liquors",         contactPerson: "Priya Sharma", email: "priya@metro.com",       phone: "+91-9876001234", avgLeadDays: 4, isActive: false },
  ];
  const suppliers = await Promise.all(
    supplierDefs.map(s => prisma.supplier.upsert({ where: { id: s.id }, update: {}, create: s as any }))
  );
  console.log("✅ Suppliers:", suppliers.map(s => s.name).join(", "));

  // ── Products ───────────────────────────────────────────────────────────────
  const productDefs = [
    {
      sku: "JW-BLK-750", name: "Johnnie Walker Black Label", brand: "Johnnie Walker",
      categoryId: catMap.whiskey.id, supplierId: suppliers[0].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "750ml",     costPrice: 2800, sellingPrice: 3400, reorderPoint: 5,  currentStock: 24 },
        { unit: UnitType.CASE,   size: "12 × 750ml", costPrice: 32000, sellingPrice: 38400, reorderPoint: 2, currentStock: 3, unitsPerParent: 12 },
      ],
    },
    {
      sku: "ABS-VOD-1L", name: "Absolut Vodka", brand: "Absolut",
      categoryId: catMap.vodka.id, supplierId: suppliers[0].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "1L",        costPrice: 2200, sellingPrice: 2800, reorderPoint: 4,  currentStock: 18 },
        { unit: UnitType.CASE,   size: "6 × 1L",    costPrice: 12600, sellingPrice: 15600, reorderPoint: 2, currentStock: 4, unitsPerParent: 6 },
      ],
    },
    {
      sku: "OM-RUM-750", name: "Old Monk Rum", brand: "Mohan Meakin",
      categoryId: catMap.rum.id, supplierId: suppliers[1].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "750ml",     costPrice: 1100, sellingPrice: 1400, reorderPoint: 8,  currentStock: 36 },
        { unit: UnitType.BOTTLE, size: "1.8L",      costPrice: 2500, sellingPrice: 3200, reorderPoint: 3,  currentStock: 12 },
      ],
    },
    {
      sku: "KF-BEER-330", name: "Kingfisher Premium Beer", brand: "United Breweries",
      categoryId: catMap.beer.id, supplierId: suppliers[1].id,
      variants: [
        { unit: UnitType.CAN,  size: "330ml",       costPrice: 55,   sellingPrice: 80,   reorderPoint: 24, currentStock: 96 },
        { unit: UnitType.CASE, size: "24 × 330ml",  costPrice: 1200, sellingPrice: 1800, reorderPoint: 4,  currentStock: 8, unitsPerParent: 24 },
      ],
    },
    {
      sku: "RS-WHK-750", name: "Royal Stag Whisky", brand: "Seagram",
      categoryId: catMap.whiskey.id, supplierId: suppliers[1].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "750ml",     costPrice: 1300, sellingPrice: 1650, reorderPoint: 10, currentStock: 48 },
        { unit: UnitType.BOTTLE, size: "375ml",     costPrice: 680,  sellingPrice: 860,  reorderPoint: 12, currentStock: 60 },
      ],
    },
    {
      sku: "SL-RED-750", name: "Sula Nashik Red Wine", brand: "Sula Vineyards",
      categoryId: catMap.wine.id, supplierId: suppliers[2].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "750ml",     costPrice: 2800, sellingPrice: 3500, reorderPoint: 6,  currentStock: 20 },
        { unit: UnitType.BOTTLE, size: "1.5L",      costPrice: 5200, sellingPrice: 6500, reorderPoint: 2,  currentStock: 6 },
      ],
    },
    {
      sku: "BF-GIN-750", name: "Beefeater London Gin", brand: "Beefeater",
      categoryId: catMap.gin.id, supplierId: suppliers[2].id,
      variants: [
        { unit: UnitType.BOTTLE, size: "750ml",     costPrice: 3200, sellingPrice: 4000, reorderPoint: 4,  currentStock: 14 },
        { unit: UnitType.BOTTLE, size: "1L",        costPrice: 4000, sellingPrice: 5000, reorderPoint: 2,  currentStock: 8 },
      ],
    },
  ];

  const products: any[] = [];
  for (const def of productDefs) {
    const { variants, ...productData } = def;
    const product = await prisma.product.upsert({
      where: { sku: def.sku },
      update: {},
      create: { ...productData, variants: { create: variants } },
      include: { variants: true },
    });
    products.push(product);
  }
  console.log("✅ Products:", products.map(p => p.name).join(", "));

  const allVariants = products.flatMap(p => p.variants);

  // ── Stock movements for initial stock (PURCHASE) ───────────────────────────
  const hasOpeningStock = await prisma.stockMovement.findFirst({ where: { reason: "Opening stock" } });
  if (!hasOpeningStock) for (const variant of allVariants) {
    if (variant.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          variantId: variant.id,
          type: MovementType.PURCHASE,
          quantity: variant.currentStock,
          balanceAfter: variant.currentStock,
          reason: "Opening stock",
          createdById: admin.id,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log("✅ Opening stock movements created");

  // ── Purchase Orders ────────────────────────────────────────────────────────
  const jwBottle  = allVariants.find(v => v.productId === products[0].id && v.unit === "BOTTLE")!;
  const absBottle = allVariants.find(v => v.productId === products[1].id && v.unit === "BOTTLE")!;
  const omBottle  = allVariants.find(v => v.productId === products[2].id && v.size === "750ml")!;
  const kfCan     = allVariants.find(v => v.productId === products[3].id && v.unit === "CAN")!;
  const rsBottle  = allVariants.find(v => v.productId === products[4].id && v.size === "750ml")!;
  const bfBottle  = allVariants.find(v => v.productId === products[6].id && v.size === "750ml")!;

  const existingPOs = new Set(
    (await prisma.purchaseOrder.findMany({ select: { poNumber: true } })).map(p => p.poNumber)
  );

  if (!existingPOs.has("PO-2026-001")) {
    await prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-001",
        supplierId: suppliers[0].id,
        status: POStatus.RECEIVED,
        expectedDate: new Date("2026-06-28"),
        receivedDate: new Date("2026-06-28"),
        totalAmount: 96000,
        createdById: admin.id,
        createdAt: new Date("2026-06-25"),
        items: { create: [
          { variantId: jwBottle.id,  orderedQty: 24, receivedQty: 24, unitCost: 2800 },
          { variantId: absBottle.id, orderedQty: 12, receivedQty: 12, unitCost: 2200 },
        ]},
      },
    });
  }

  if (!existingPOs.has("PO-2026-002")) {
    await prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-002",
        supplierId: suppliers[1].id,
        status: POStatus.PARTIAL_RECEIVED,
        expectedDate: new Date("2026-07-02"),
        totalAmount: 88000,
        createdById: manager.id,
        createdAt: new Date("2026-06-29"),
        items: { create: [
          { variantId: omBottle.id, orderedQty: 48, receivedQty: 24, unitCost: 1100 },
          { variantId: rsBottle.id, orderedQty: 60, receivedQty: 48, unitCost: 1300 },
        ]},
      },
    });
  }

  if (!existingPOs.has("PO-2026-003")) {
    await prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-003",
        supplierId: suppliers[2].id,
        status: POStatus.SENT,
        expectedDate: new Date("2026-07-05"),
        totalAmount: 60800,
        createdById: admin.id,
        createdAt: new Date("2026-06-30"),
        items: { create: [
          { variantId: bfBottle.id, orderedQty: 12, receivedQty: 0, unitCost: 3200 },
          { variantId: kfCan.id,    orderedQty: 96, receivedQty: 0, unitCost: 55 },
        ]},
      },
    });
  }

  if (!existingPOs.has("PO-2026-004")) {
    await prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-004",
        supplierId: suppliers[0].id,
        status: POStatus.DRAFT,
        expectedDate: new Date("2026-07-10"),
        totalAmount: 120000,
        createdById: manager.id,
        createdAt: new Date("2026-07-01"),
        items: { create: [
          { variantId: jwBottle.id,  orderedQty: 36, receivedQty: 0, unitCost: 2800 },
          { variantId: absBottle.id, orderedQty: 12, receivedQty: 0, unitCost: 2200 },
        ]},
      },
    });
  }
  console.log("✅ Purchase orders: PO-2026-001 to PO-2026-004");

  // ── Sales (last 7 days) ────────────────────────────────────────────────────
  const saleData = [
    {
      num: "SALE-A1B2",     paymentType: PaymentType.CASH,
      items: [{ v: jwBottle, qty: 2, price: 3400 }, { v: kfCan, qty: 4, price: 80 }],
      daysAgo: 0, hoursAgo: 2,
    },
    {
      num: "SALE-C3D4",     paymentType: PaymentType.CARD,
      items: [{ v: absBottle, qty: 3, price: 2800 }],
      daysAgo: 0, hoursAgo: 5,
    },
    {
      num: "SALE-E5F6",     paymentType: PaymentType.UPI,
      items: [{ v: rsBottle, qty: 6, price: 1650 }, { v: omBottle, qty: 2, price: 1400 }],
      daysAgo: 1, hoursAgo: 3,
    },
    {
      num: "SALE-G7H8",     paymentType: PaymentType.CASH,
      items: [{ v: jwBottle, qty: 1, price: 3400 }, { v: bfBottle, qty: 2, price: 4000 }],
      daysAgo: 1, hoursAgo: 8,
    },
    {
      num: "SALE-I9J0",     paymentType: PaymentType.CARD,
      items: [{ v: kfCan, qty: 12, price: 80 }, { v: absBottle, qty: 2, price: 2800 }],
      daysAgo: 2, hoursAgo: 4,
    },
    {
      num: "SALE-K1L2",     paymentType: PaymentType.CASH,
      items: [{ v: omBottle, qty: 4, price: 1400 }],
      daysAgo: 3, hoursAgo: 6,
    },
    {
      num: "SALE-M3N4",     paymentType: PaymentType.UPI,
      items: [{ v: rsBottle, qty: 8, price: 1650 }],
      daysAgo: 4, hoursAgo: 2,
    },
    {
      num: "SALE-O5P6",     paymentType: PaymentType.CARD,
      items: [{ v: jwBottle, qty: 3, price: 3400 }],
      daysAgo: 5, hoursAgo: 7,
    },
  ];

  const existingSales = new Set(
    (await prisma.sale.findMany({ select: { saleNumber: true } })).map(s => s.saleNumber)
  );

  for (const s of saleData) {
    if (existingSales.has(s.num)) continue;
    const totalAmount = s.items.reduce((acc, i) => acc + i.qty * i.price, 0);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - s.daysAgo);
    createdAt.setHours(createdAt.getHours() - s.hoursAgo);

    const sale = await prisma.sale.create({
      data: {
        saleNumber: s.num,
        totalAmount,
        paymentType: s.paymentType,
        createdById: s.daysAgo === 0 ? staff.id : (s.daysAgo % 2 === 0 ? manager.id : staff.id),
        createdAt,
        items: {
          create: s.items.map(i => ({
            variantId: i.v.id,
            quantity: i.qty,
            unitPrice: i.price,
            totalPrice: i.qty * i.price,
          })),
        },
      },
    });

    // Deduct stock and create movements
    for (const item of s.items) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.v.id } });
      const newStock = Math.max(0, (variant?.currentStock ?? 0) - item.qty);
      await prisma.productVariant.update({
        where: { id: item.v.id },
        data: { currentStock: newStock },
      });
      await prisma.stockMovement.create({
        data: {
          variantId: item.v.id,
          type: MovementType.SALE,
          quantity: -item.qty,
          balanceAfter: newStock,
          reason: sale.saleNumber,
          referenceId: sale.id,
          referenceType: "Sale",
          createdById: sale.createdById,
          createdAt,
        },
      });
    }
  }
  console.log("✅ Sales: 8 transactions over the last 5 days");

  // ── A manual adjustment ────────────────────────────────────────────────────
  const hasWastage = await prisma.stockMovement.findFirst({ where: { reason: "Damaged cans — dented on delivery" } });
  if (!hasWastage) {
  const kfVariant = await prisma.productVariant.findUnique({ where: { id: kfCan.id } });
  const adjStock = (kfVariant?.currentStock ?? 0) - 2;
  await prisma.productVariant.update({ where: { id: kfCan.id }, data: { currentStock: adjStock } });
  await prisma.stockMovement.create({
    data: {
      variantId: kfCan.id,
      type: MovementType.WASTAGE,
      quantity: -2,
      balanceAfter: adjStock,
      reason: "Damaged cans — dented on delivery",
      createdById: manager.id,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });
  console.log("✅ Stock adjustment (wastage) recorded");
  }

  // ── Store Settings ─────────────────────────────────────────────────────────
  const settingDefs = [
    { key: "store_name",    value: "My Liquor Shop" },
    { key: "currency",      value: "रू" },
    { key: "gstin",         value: "07AABCU9603R1ZX" },
    { key: "address",       value: "123 Main Road, Kathmandu" },
    { key: "phone",         value: "+977-9800000000" },
    { key: "low_stock_threshold", value: "10" },
  ];
  await Promise.all(
    settingDefs.map(s => prisma.storeSetting.upsert({ where: { key: s.key }, update: {}, create: s }))
  );
  console.log("✅ Store settings seeded");

  // ── Customers ─────────────────────────────────────────────────────────────
  const namedCustomerDefs = [
    { name: "Ravi Wines & Spirits", phone: "+91-9876000001", email: "ravi@ravinewines.com", creditLimit: 50000,  creditBalance: 12000 },
    { name: "Hotel Grand Bar",      phone: "+91-9876000002", email: "bar@hotelgrand.com",   creditLimit: 100000, creditBalance: 35000 },
    { name: "The Lounge Club",      phone: "+91-9876000003", email: "mgr@thelounge.in",     creditLimit: 75000,  creditBalance: 0 },
  ];
  const namedCustomers = await Promise.all(
    namedCustomerDefs.map(c =>
      prisma.customer.upsert({ where: { phone: c.phone }, update: {}, create: c })
    )
  );
  // Walk-in has no phone — use findFirst to avoid duplicate on re-seed
  const walkIn = await prisma.customer.findFirst({ where: { name: "Walk-in Customer" } })
    ?? await prisma.customer.create({ data: { name: "Walk-in Customer", creditLimit: 0, creditBalance: 0 } });
  const customers = [...namedCustomers, walkIn];
  console.log("✅ Customers:", customers.map(c => c.name).join(", "));

  // ── Dealer Orders ──────────────────────────────────────────────────────────
  const [raviCust, hotelCust, loungeCust] = customers;

  await prisma.dealerOrder.upsert({
    where: { orderNumber: "DO-2026-001" },
    update: {},
    create: {
      orderNumber:   "DO-2026-001",
      customerId:    raviCust.id,
      status:        DealerOrderStatus.DELIVERED,
      paymentType:   PaymentType.CARD,
      totalAmount:   45200,
      paidAmount:    45200,
      paymentStatus: PaymentStatus.PAID,
      invoiceNumber: "INV-001",
      dispatchDate:  new Date("2026-06-28"),
      createdById:   admin.id,
      createdAt:     new Date("2026-06-25"),
      items: {
        create: [
          { variantId: jwBottle.id,  orderedQty: 8,  dispatchedQty: 8,  unitPrice: 3400, totalPrice: 27200 },
          { variantId: absBottle.id, orderedQty: 6,  dispatchedQty: 6,  unitPrice: 2800, totalPrice: 16800 },
          { variantId: kfCan.id,     orderedQty: 24, dispatchedQty: 24, unitPrice: 50,   totalPrice: 1200 },
        ],
      },
    },
  });

  await prisma.dealerOrder.upsert({
    where: { orderNumber: "DO-2026-002" },
    update: {},
    create: {
      orderNumber:   "DO-2026-002",
      customerId:    hotelCust.id,
      status:        DealerOrderStatus.CONFIRMED,
      paymentType:   PaymentType.UPI,
      totalAmount:   88000,
      paidAmount:    35000,
      paymentStatus: PaymentStatus.PARTIAL,
      createdById:   manager.id,
      createdAt:     new Date("2026-07-02"),
      items: {
        create: [
          { variantId: jwBottle.id,  orderedQty: 12, dispatchedQty: 0, unitPrice: 3400, totalPrice: 40800 },
          { variantId: bfBottle.id,  orderedQty: 6,  dispatchedQty: 0, unitPrice: 4000, totalPrice: 24000 },
          { variantId: rsBottle.id,  orderedQty: 14, dispatchedQty: 0, unitPrice: 1650, totalPrice: 23100 },
        ],
      },
    },
  });

  await prisma.dealerOrder.upsert({
    where: { orderNumber: "DO-2026-003" },
    update: {},
    create: {
      orderNumber:   "DO-2026-003",
      customerId:    loungeCust.id,
      status:        DealerOrderStatus.DRAFT,
      paymentType:   PaymentType.CASH,
      totalAmount:   28000,
      paidAmount:    0,
      paymentStatus: PaymentStatus.UNPAID,
      createdById:   manager.id,
      createdAt:     new Date("2026-07-05"),
      items: {
        create: [
          { variantId: omBottle.id,  orderedQty: 10, dispatchedQty: 0, unitPrice: 1400, totalPrice: 14000 },
          { variantId: absBottle.id, orderedQty: 5,  dispatchedQty: 0, unitPrice: 2800, totalPrice: 14000 },
        ],
      },
    },
  });
  console.log("✅ Dealer orders: DO-2026-001 to DO-2026-003");

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenseDefs = [
    { category: "Rent",         amount: 25000, description: "Monthly shop rent",           daysAgo: 30 },
    { category: "Electricity",  amount: 4500,  description: "June electricity bill",       daysAgo: 10 },
    { category: "Staff Wages",  amount: 18000, description: "Staff salary for June",       daysAgo: 5  },
    { category: "Packaging",    amount: 2200,  description: "Carry bags and gift wraps",   daysAgo: 12 },
    { category: "Maintenance",  amount: 1800,  description: "AC servicing",                daysAgo: 20 },
    { category: "Misc",         amount: 800,   description: "Stationery and office items", daysAgo: 3  },
    { category: "Transport",    amount: 3500,  description: "Delivery vehicle fuel",       daysAgo: 7  },
  ];
  const hasExpenses = await prisma.expense.findFirst();
  if (!hasExpenses) await Promise.all(
    expenseDefs.map(e => {
      const date = new Date();
      date.setDate(date.getDate() - e.daysAgo);
      return prisma.expense.create({
        data: {
          category:    e.category,
          amount:      e.amount,
          description: e.description,
          date,
          createdById: e.daysAgo > 10 ? admin.id : manager.id,
          createdAt:   date,
        },
      });
    })
  );
  console.log("✅ Expenses: 7 entries across last 30 days");

  console.log("\n🎉 Seeding complete!\n");
  console.log("📋 Login credentials:");
  console.log("   Admin:   admin@liquorerp.com   / admin1234");
  console.log("   Manager: manager@liquorerp.com / manager1234");
  console.log("   Staff:   staff@liquorerp.com   / staff1234\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
