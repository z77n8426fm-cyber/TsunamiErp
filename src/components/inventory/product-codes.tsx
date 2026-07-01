"use client";

import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Códigos del producto: QR (contiene el SKU, escaneable desde la app)
 * y código de barras en formato CODE128 si está definido.
 */
export function ProductCodes({ sku, barcode }: { sku: string; barcode: string | null }) {
  return (
    <Card>
      <CardHeader><CardTitle>Códigos</CardTitle></CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={sku} size={120} />
        </div>
        <p className="text-xs text-muted">QR — SKU: {sku}</p>

        {barcode && (
          <div className="max-w-full overflow-hidden rounded-lg bg-white p-2">
            <Barcode value={barcode} height={48} width={1.4} fontSize={12} format="CODE128" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
