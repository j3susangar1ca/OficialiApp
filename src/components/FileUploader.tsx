import React, { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";

interface FileUploaderProps {
  onFileAnalyzed: (file: File, analysisData: any) => void;
  lastFolioNumber: number;
  directoryContacts: any[];
}

export default function FileUploader({ onFileAnalyzed, lastFolioNumber, directoryContacts }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Solo se admiten documentos en formato PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus("error");
      setErrorMessage("El archivo supera el límite de 10 MB.");
      return;
    }

    setStatus("uploading");
    setErrorMessage("");
    setProgress(20);

    try {
      // Simulate small file read progress before server upload
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 80 ? prev + 15 : prev));
      }, 300);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("lastFolioNumber", String(lastFolioNumber));
      formData.append("directory", JSON.stringify(directoryContacts));

      setProgress(85);
      setStatus("analyzing");

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocurrió un error al procesar el archivo con IA.");
      }

      const analysisResult = await response.json();
      setStatus("idle");
      onFileAnalyzed(file, analysisResult);
    } catch (error: any) {
      console.error("Error during document analysis:", error);
      setStatus("error");
      setErrorMessage(error.message || "No se pudo conectar con el servicio de análisis de IA.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto" id="file-uploader-container">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={status === "idle" || status === "error" ? triggerFileInput : undefined}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/40 bg-white"
        } ${status !== "idle" && status !== "error" ? "pointer-events-none" : ""}`}
        id="drag-drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
          id="pdf-file-input"
        />

        {status === "idle" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full shadow-xs">
              <Upload className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                Arrastra y suelta tu archivo PDF aquí
              </p>
              <p className="text-xs text-slate-500 mt-1">
                o haz clic para buscar en tu ordenador (Máximo 10 MB)
              </p>
            </div>
            <div className="inline-flex items-center text-xs text-indigo-600 font-medium px-2.5 py-1 bg-indigo-50 rounded-full">
              Procesamiento Multimodal con Gemini 2.5 Flash
            </div>
          </div>
        )}

        {(status === "uploading" || status === "analyzing") && (
          <div className="flex flex-col items-center space-y-5 py-4">
            <div className="relative">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full animate-spin">
                <Loader2 className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-2 w-full max-w-md mx-auto">
              <p className="text-base font-semibold text-slate-800 animate-pulse">
                {status === "uploading" ? "Cargando documento..." : "Analizando documento por IA..."}
              </p>
              <p className="text-xs text-slate-500">
                Extrayendo remitente, fechas, número de oficio y asunto automáticamente
              </p>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-mono text-slate-500">{progress}%</span>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center space-y-4 py-2">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-semibold text-rose-800">Error de Análisis</p>
              <p className="text-sm text-rose-600 mt-1">{errorMessage}</p>
              <p className="text-xs text-slate-400 mt-3">Haz clic para intentar con otro archivo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
