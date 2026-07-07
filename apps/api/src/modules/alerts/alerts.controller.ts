import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Alerts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "alerts", version: "1" })
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get("low-stock") getLowStock() { return this.alertsService.getLowStockAlerts(); }
}
