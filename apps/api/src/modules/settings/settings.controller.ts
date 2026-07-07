import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@ApiTags("Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "settings", version: "1" })
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get all store settings" })
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update store settings (key-value pairs)" })
  setMany(@Body() data: Record<string, string>) {
    return this.settingsService.setMany(data);
  }
}
