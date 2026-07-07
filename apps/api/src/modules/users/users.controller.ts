import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get() findAll() { return this.usersService.findAll(); }
  @Post() create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.usersService.update(id, body); }
}
