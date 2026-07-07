"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Camera, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!open || mode !== "camera") return;

    let scanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!document.getElementById("qr-reader")) return;
        scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        setScanning(true);
        setError("");

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            onScan(decodedText);
            onClose();
          },
          () => {}
        );
      } catch (e: any) {
        setError("Camera not available. Use manual entry instead.");
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [open, mode]);

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    onClose();
  };

  const handleClose = () => {
    setManualCode("");
    setError("");
    setMode("camera");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine size={16} /> Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={mode === "camera" ? "default" : "outline"}
            className="flex-1 gap-1.5 h-8 text-xs"
            onClick={() => setMode("camera")}
          >
            <Camera size={12} /> Camera
          </Button>
          <Button
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            className="flex-1 gap-1.5 h-8 text-xs"
            onClick={() => setMode("manual")}
          >
            <Keyboard size={12} /> Manual
          </Button>
        </div>

        {mode === "camera" && (
          <div className="space-y-3">
            <div
              id="qr-reader"
              className="w-full rounded-lg overflow-hidden bg-muted"
              style={{ minHeight: 200 }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!scanning && !error && (
              <p className="text-xs text-muted-foreground text-center">Starting camera…</p>
            )}
            {scanning && (
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <ScanLine size={11} className="animate-pulse" /> Point at a barcode
              </p>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Enter Barcode / SKU</Label>
              <Input
                autoFocus
                placeholder="Scan or type barcode…"
                className="text-sm font-mono"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
              />
            </div>
            <Button
              className="w-full gap-1.5"
              disabled={!manualCode.trim()}
              onClick={handleManualSubmit}
            >
              <ScanLine size={14} /> Look Up Product
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
