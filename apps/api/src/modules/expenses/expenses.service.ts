import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(dateFrom?: string, dateTo?: string, category?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo   && { lte: new Date(dateTo + "T23:59:59.999Z")   }),
        },
      }),
      ...(category && { category: { contains: category, mode: "insensitive" } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getSummary(dateFrom?: string, dateTo?: string) {
    const where: any = (dateFrom || dateTo) ? {
      date: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo + "T23:59:59.999Z")   }),
      },
    } : {};
    const expenses = await this.prisma.expense.findMany({ where });
    const total    = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount); });
    return { total, byCategory, count: expenses.length };
  }

  async create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.expense.create({
      data: {
        category:    dto.category,
        amount:      dto.amount,
        description: dto.description,
        date:        new Date(dto.date),
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException("Expense not found");
    return this.prisma.expense.delete({ where: { id } });
  }
}
