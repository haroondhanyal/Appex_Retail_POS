import { useState, useRef, useEffect } from "react";
import type React from "react";
import { Camera, X, Scan, AlertCircle, Sparkles, Keyboard, CheckCircle2 } from "lucide-react";
import { Product } from "../types";
import { playBeepSound, playErrorSound } from "../services/sound";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanProduct: (product: Product) => void;
  soundEnabled: boolean;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onScanProduct,
  soundEnabled
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);

  // Start Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: any = null;

    if (isOpen) {
      setCameraError(null);
      setScanMessage(null);
      setIsScanningActive(true);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
          })
          .then(mediaStream => {
            stream = mediaStream;
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
              setCameraActive(true);
            }

            // Check if Native BarcodeDetector API is supported in browser
            if ("BarcodeDetector" in window) {
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"]
              });

              scanInterval = setInterval(async () => {
                if (!videoRef.current || videoRef.current.readyState < 2) return;
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const detectedRaw = barcodes[0].rawValue;
                    handleDetectedBarcode(detectedRaw);
                  }
                } catch (e) {
                  // Frame decode skip
                }
              }, 400);
            }
          })
          .catch(err => {
            console.warn("Camera stream unavailable:", err);
            setCameraError(
              "Camera access restricted or unavailable. Use the manual barcode entry or sample quick-scan buttons below."
            );
            setCameraActive(false);
          });
      } else {
        setCameraError("Camera device not supported in this browser environment.");
      }
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    };
  }, [isOpen]);

  const handleDetectedBarcode = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const matched = products.find(
      p => p.barcode.toLowerCase() === trimmed.toLowerCase() || p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (matched) {
      playBeepSound(soundEnabled);
      setScanMessage(`Scanned: ${matched.name} (${matched.barcode})`);
      onScanProduct(matched);
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      playErrorSound(soundEnabled);
      setScanMessage(`Barcode "${trimmed}" not recognized in product inventory`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDetectedBarcode(manualCode);
    setManualCode("");
  };

  // Quick sample test barcodes so cashiers/testers can simulate scanner with 1 click
  const quickTestItems = products.slice(0, 6);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-800 text-emerald-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Native Retail Barcode Scanner</h3>
              <p className="text-[11px] text-neutral-400">Point device camera at EAN-13, UPC, Code 128, or QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera Section */}
        <div className="relative bg-black h-64 sm:h-72 flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center text-neutral-400 max-w-xs">
              <Camera className="w-12 h-12 mx-auto mb-2 text-neutral-600 opacity-60" />
              <p className="text-xs">{cameraError || "Initializing native camera video feed..."}</p>
            </div>
          )}

          {/* Aiming Reticle and Red Laser Line Animation */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-56 h-36 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>

              {/* Laser animation */}
              <div className="absolute w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce"></div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-semibold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                ALIGN BARCODE
              </span>
            </div>
          </div>
        </div>

        {/* Status Toast Notification */}
        {scanMessage && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
              scanMessage.startsWith("Scanned:")
                ? "bg-emerald-50 text-emerald-800 border-y border-emerald-200"
                : "bg-red-50 text-red-800 border-y border-red-200"
            }`}
          >
            {scanMessage.startsWith("Scanned:") ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{scanMessage}</span>
          </div>
        )}

        {/* Manual Barcode Input */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Type or scan barcode manually (e.g. 5449000000996)..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition shrink-0"
            >
              Add to Cart
            </button>
          </form>
        </div>

        {/* One-Tap Sample Barcode Simulator */}
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Instant Hardware Laser Simulation
            </span>
            <span className="text-[10px] text-neutral-400">Click to instantly scan item</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {quickTestItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleDetectedBarcode(item.barcode)}
                className="flex items-center gap-2 p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-400 text-left transition group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-neutral-900 truncate group-hover:text-blue-600">
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 truncate">{item.barcode}</div>
                  <div className="text-[11px] font-bold text-neutral-900">${item.sellingPrice.toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
