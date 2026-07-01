"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Exportación de reportes:
 * — Excel: genera un archivo CSV (UTF-8 con BOM, compatible con Excel).
 * — PDF: usa el diálogo de impresión del navegador (Guardar como PDF).
 */
export function ExportButtons({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  function exportCsv() {
    const escape = (value: string | number) => {
      const s = String(value ?? "");
      return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv}>
        <FileDown className="h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}
