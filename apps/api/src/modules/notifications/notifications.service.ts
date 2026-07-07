import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { type: string; title: string; message: string; entityId?: string }) {
    return this.prisma.notification.create({ data });
  }

  async findAll(unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getUnreadCount() {
    return this.prisma.notification.count({ where: { isRead: false } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead() {
    return this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  }
}
