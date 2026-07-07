import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

const DEFAULTS: Record<string, string> = {
  store_name:    "My Liquor Store",
  store_address: "",
  store_phone:   "",
  store_email:   "",
  pan_number:    "",
  vat_number:    "",
  vat_rate:      "13",
  currency:      "रू",
  receipt_footer: "Thank you for your purchase!",
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.storeSetting.findMany();
    const map = { ...DEFAULTS };
    rows.forEach(r => { map[r.key] = r.value; });
    return map;
  }

  async get(key: string): Promise<string> {
    const row = await this.prisma.storeSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? "";
  }

  async setMany(data: Record<string, string>) {
    const ops = Object.entries(data).map(([key, value]) =>
      this.prisma.storeSetting.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    );
    await Promise.all(ops);
    return this.getAll();
  }
}
