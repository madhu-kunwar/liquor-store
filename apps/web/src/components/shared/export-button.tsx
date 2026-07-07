"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { downloadCSV, downloadXLSX, type ExportRow } from "@/lib/utils/export";
import { toast } from "sonner";

interface ExportButtonProps {
  data: ExportRow[];
  filename: string;
  sheetName?: string;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  sheetName = "Data",
  label = "Export",
  disabled = false,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<"csv" | "xlsx" | null>(null);

  const handle = async (type: "csv" | "xlsx") => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }
    setLoading(type);
    try {
      await new Promise((r) => setTimeout(r, 120)); // let spinner render
      if (type === "csv") {
        downloadCSV(data, filename);
        toast.success(`Exported ${data.length} rows as CSV`);
      } else {
        downloadXLSX(data, filename, sheetName);
        toast.success(`Exported ${data.length} rows as Excel`);
      }
    } catch (e) {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={disabled || !!loading} />}>
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {loading ? "Exporting..." : label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {data.length} row{data.length !== 1 ? "s" : ""} ready
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2.5 text-xs cursor-pointer"
          onClick={() => handle("xlsx")}
        >
          <FileSpreadsheet size={13} className="text-emerald-500" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2.5 text-xs cursor-pointer"
          onClick={() => handle("csv")}
        >
          <FileText size={13} className="text-blue-400" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
