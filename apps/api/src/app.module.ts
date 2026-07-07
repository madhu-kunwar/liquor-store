import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { SalesModule } from "./modules/sales/sales.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { DealerOrdersModule } from "./modules/dealer-orders/dealer-orders.module";
import { PrismaModule } from "./common/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    SuppliersModule,
    PurchaseOrdersModule,
    SalesModule,
    ReportsModule,
    AlertsModule,
    AuditModule,
    CategoriesModule,
    CustomersModule,
    NotificationsModule,
    ExpensesModule,
    SettingsModule,
    DealerOrdersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
