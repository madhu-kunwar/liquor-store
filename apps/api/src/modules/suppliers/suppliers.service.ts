import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { SupplierQueryDto } from "./dto/supplier-query.dto";

const SUPPLIER_SORT_FIELDS = new Set(["name", "avgLeadDays", "isActive", "createdAt"]);

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: SupplierQueryDto) {
    const {
      search, isActive,
      page = 1, limit = 20,
      sortBy, sortOrder = "asc",
    } = query;

    const skip = (page - 1) * limit;
    const orderBy: Prisma.SupplierOrderByWithRelationInput =
      sortBy === "products"
        ? { products: { _count: sortOrder as Prisma.SortOrder } }
        : sortBy === "purchaseOrders"
        ? { purchaseOrders: { _count: sortOrder as Prisma.SortOrder } }
        : sortBy && SUPPLIER_SORT_FIELDS.has(sortBy)
        ? { [sortBy]: sortOrder as Prisma.SortOrder }
        : { name: Prisma.SortOrder.asc };

    const where = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { contactPerson: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        include: { _count: { select: { products: true, purchaseOrders: true } } },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: { include: { variants: true } },
        purchaseOrders: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { products: true, purchaseOrders: true } },
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}
