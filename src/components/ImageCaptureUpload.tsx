import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertCircle,
  FlipHorizontal
} from "lucide-react";

interface ImageCaptureUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

const SAMPLE_RETAIL_IMAGES = [
  { label: "Beverage", url: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500&q=80" },
  { label: "Bakery", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80" },
  { label: "Dairy", url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80" },
  { label: "Produce", url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&q=80" },
  { label: "Snack", url: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&q=80" },
  { label: "Personal Care", url: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&q=80" }
];

export function ImageCaptureUpload({
  value,
  onChange,
  label = "Product / Item Picture",
  required = false
}: ImageCaptureUploadProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Start Camera
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setIsCameraOpen(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in your browser or upload an image file directly."
          : "Unable to connect to camera device: " + (err.message || "Device not accessible.")
      );
    }
  };

  // Switch between front/back camera
  const toggleFacingMode = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Capture Frame
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    // Max 800x800 for optimal storage & performance
    const maxDim = 800;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip if user-facing
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onChange(dataUrl);
    stopCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Device File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPEG, PNG, WebP, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        // Compress using an offscreen image & canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            onChange(canvas.toDataURL("image/jpeg", 0.88));
          } else {
            onChange(result);
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition"
          >
            Remove Picture
          </button>
        )}
      </div>

      {/* Main Image Control Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-3 sm:p-4 transition-all ${
          isDragging
            ? "border-neutral-900 bg-neutral-100"
            : value
            ? "border-neutral-200 bg-white"
            : "border-neutral-300 bg-neutral-50/70 hover:bg-neutral-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {value ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-neutral-200 shadow-2xs shrink-0 bg-neutral-100">
              <img
                src={value}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                <span className="text-[10px] text-white font-bold px-2 py-0.5 bg-black/60 rounded-md">
                  Active
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Image Attached & Verified</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Captured or uploaded snapshot is ready for retail catalog and barcode scanning.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-50 transition shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Different</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 sm:py-3 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-200/80 text-neutral-700 mx-auto flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-800">
                Capture live picture or upload item photo
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Take a direct snapshot with your device camera or choose from your files
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition shadow-xs"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Take Live Picture</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-100 transition shadow-2xs"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Upload Device File</span>
              </button>
            </div>

            {/* Quick Retail Presets */}
            <div className="pt-2 border-t border-neutral-200/80">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Or pick retail demo asset:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {SAMPLE_RETAIL_IMAGES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(sample.url)}
                    className="px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-medium transition"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal / Live Viewfinder */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 bg-neutral-950 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-white tracking-wide">Live Camera Viewfinder</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="Switch Camera (Front/Back)"
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center max-w-xs space-y-3">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                  <p className="text-xs text-red-300 font-medium">{cameraError}</p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Framing Crosshair Overlay */}
                  <div className="absolute inset-8 border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-12 h-0.5 bg-white/50" />
                    <div className="h-12 w-0.5 bg-white/50 absolute" />
                    <span className="absolute bottom-2 text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded">
                      Align product label in frame
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(cameraError)}
                onClick={captureFrame}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg transition"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Picture</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
