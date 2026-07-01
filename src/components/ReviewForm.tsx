import React, { useState, useEffect } from "react";
import { FileText, Check, ArrowLeft, RefreshCw, Bookmark, AlertCircle, Building, User, Tag } from "lucide-react";
import { Contact, IncomingDocument } from "../types";

interface ReviewFormProps {
  file: File;
  analysisData: any;
  directoryContacts: Contact[];
  onConfirm: (finalData: IncomingDocument) => Promise<void>;
  onCancel: () => void;
}

export default function ReviewForm({
  file,
  analysisData,
  directoryContacts,
  onConfirm,
  onCancel
}: ReviewFormProps) {
  // Generate a local object URL to render the PDF file in the iframe
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [folioId, setFolioId] = useState(analysisData.folio_id || "");
  const [docNumber, setDocNumber] = useState(analysisData.doc_number || "");
  const [senderName, setSenderName] = useState(analysisData.sender_name || "");
  const [senderTitle, setSenderTitle] = useState(analysisData.sender_title || "");
  const [senderOrganization, setSenderOrganization] = useState(analysisData.sender_organization || "");
  const [recipientName, setRecipientName] = useState(analysisData.recipient_name || "");
  const [recipientTitle, setRecipientTitle] = useState(analysisData.recipient_title || "");
  const [dateDocument, setDateDocument] = useState(analysisData.date_document || "");
  const [dateReception, setDateReception] = useState(analysisData.date_reception || "");
  const [timeReception, setTimeReception] = useState(analysisData.time_reception || "");
  const [subject, setSubject] = useState(analysisData.subject || "");
  const [classification, setClassification] = useState<"requiere_accion" | "informativo">(
    analysisData.classification || "informativo"
  );
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(analysisData.due_date || "");
  const [syncCalendar, setSyncCalendar] = useState(
    analysisData.classification === "requiere_accion"
  );

  // Directory connection states
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    analysisData.matched_sender_id || null
  );

  useEffect(() => {
    // Generate blob URL for PDF viewing
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Revoke url on unmount to prevent leaks
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  // Handle auto-match or search in directory
  useEffect(() => {
    // If we didn't get an explicit ID but we have a name, let's search if someone in directory matches loosely
    if (!selectedContactId && senderName) {
      const match = directoryContacts.find(
        (c) =>
          c.name.toLowerCase().includes(senderName.toLowerCase()) ||
          senderName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        setSelectedContactId(match.contact_id);
      }
    }
  }, [senderName, directoryContacts, selectedContactId]);

  const handleContactSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "") {
      setSelectedContactId(null);
    } else {
      setSelectedContactId(val);
      // Auto-fill from selected contact
      const contact = directoryContacts.find((c) => c.contact_id === val);
      if (contact) {
        setSenderName(contact.name);
        setSenderTitle(contact.title);
        setSenderOrganization(contact.organization);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber || !senderName || !recipientName || !subject || !dateDocument) {
      setError("Por favor, complete todos los campos obligatorios (*).");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const finalDocument: IncomingDocument = {
        folio_id: folioId,
        doc_number: docNumber,
        sender_name: senderName,
        sender_title: senderTitle,
        sender_organization: senderOrganization,
        recipient_name: recipientName,
        recipient_title: recipientTitle,
        date_document: dateDocument,
        date_reception: dateReception,
        time_reception: timeReception,
        subject: subject,
        classification: classification,
        pdf_url: "", // Handled by App.tsx during storage upload
        registered_by: "", // Filled by App.tsx from current user
        status: "pendiente",
        notes: notes,
        due_date: dueDate || null,
        sync_calendar: syncCalendar
      };

      await onConfirm(finalDocument);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar el documento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get matched contact details for indicator
  const matchedContact = directoryContacts.find((c) => c.contact_id === selectedContactId);

  return (
    <div className="w-full flex flex-col space-y-4" id="review-form-container">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button
          onClick={onCancel}
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          id="btn-back-upload"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Volver a cargar
        </button>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folio Propuesto</span>
          <p className="text-xl font-black text-indigo-600 font-mono" id="proposed-folio-title">
            {folioId}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-r-lg flex items-start space-x-2 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[650px]" id="split-screen-layout">
        {/* Left Side: PDF Viewer */}
        <div className="bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 flex flex-col shadow-xs" id="pdf-viewer-pane">
          <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span className="truncate max-w-[200px]">{file.name}</span>
            </div>
            <span className="text-xs font-mono text-slate-300">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div className="flex-1 min-h-[500px] relative">
            {pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-none absolute inset-0"
                title="Vista previa del oficio PDF"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Generando visor de documento...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form fields from AI analysis */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm flex flex-col" id="analysis-fields-pane">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <Tag className="h-4 text-indigo-600 mr-2" />
              Verificación de Datos Extraídos por IA
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full flex items-center">
              <Check className="h-3 w-3 mr-1" /> Inteligencia Gemini
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            {/* Directory matching */}
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cotejar con Directorio de Remitentes
              </label>
              <select
                value={selectedContactId || ""}
                onChange={handleContactSelectChange}
                className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                id="directory-matcher-select"
              >
                <option value="">-- No coincide / Remitente Externo no registrado --</option>
                {directoryContacts.map((contact) => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.name} - {contact.organization} ({contact.title})
                  </option>
                ))}
              </select>

              {matchedContact && (
                <div className="mt-2 text-xs text-indigo-700 flex items-center space-x-1 font-bold bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                  <Check className="h-3.5 w-3.5" />
                  <span>Cotejado exitosamente con {matchedContact.name} ({matchedContact.organization})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doc Number */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Número de Oficio *
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. S/N, OF-54/2026"
                  id="field-doc-number"
                />
              </div>

              {/* Proposed Folio */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  ID de Folio (Calculado)
                </label>
                <input
                  type="text"
                  disabled
                  value={folioId}
                  className="w-full text-xs bg-slate-50 border-2 border-slate-200 text-slate-500 rounded-xl px-3 py-2 cursor-not-allowed font-mono font-bold"
                  id="field-folio-id"
                />
              </div>
            </div>

            {/* Sender Section */}
            <div className="border-2 border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/30">
              <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Remitente</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. Lic. Juan Pérez"
                  id="field-sender-name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={senderTitle}
                    onChange={(e) => setSenderTitle(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Director General"
                    id="field-sender-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Institución / Organización</label>
                  <input
                    type="text"
                    value={senderOrganization}
                    onChange={(e) => setSenderOrganization(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Secretaría de Hacienda"
                    id="field-sender-org"
                  />
                </div>
              </div>
            </div>

            {/* Recipient Section */}
            <div className="border-2 border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/30">
              <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Destinatario / Titular</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Ing. María Rodríguez"
                    id="field-recipient-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Oficial Mayor"
                    id="field-recipient-title"
                  />
                </div>
              </div>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Oficio *
                </label>
                <input
                  type="date"
                  required
                  value={dateDocument}
                  onChange={(e) => setDateDocument(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="field-date-doc"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Recepción
                </label>
                <input
                  type="date"
                  required
                  value={dateReception}
                  onChange={(e) => setDateReception(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="field-date-reception"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Hora Recepción
                </label>
                <input
                  type="text"
                  required
                  value={timeReception}
                  onChange={(e) => setTimeReception(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="HH:MM"
                  id="field-time-reception"
                />
              </div>
            </div>

            {/* Critical Dates & Calendar Sync */}
            <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Fecha de Vencimiento / Plazo
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs bg-white border-2 border-amber-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-amber-950"
                    id="field-due-date"
                  />
                </div>
                <div className="flex items-center pt-2 md:pt-4">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncCalendar}
                      onChange={(e) => setSyncCalendar(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                      id="checkbox-sync-calendar"
                    />
                    <span className="text-xs font-bold text-amber-950">
                      Agendar en Calendario Institucional
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Clasificación IA *
              </label>
              <div className="grid grid-cols-2 gap-3" id="classification-radio-group">
                <label
                  className={`flex items-center justify-center space-x-2 border-2 rounded-2xl p-3 cursor-pointer transition-all ${
                    classification === "requiere_accion"
                      ? "border-amber-500 bg-amber-50 text-amber-800 font-bold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    value="requiere_accion"
                    checked={classification === "requiere_accion"}
                    onChange={() => {
                      setClassification("requiere_accion");
                      setSyncCalendar(true);
                    }}
                    className="sr-only"
                  />
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold">Requiere Acción</span>
                </label>

                <label
                  className={`flex items-center justify-center space-x-2 border-2 rounded-2xl p-3 cursor-pointer transition-all ${
                    classification === "informativo"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-bold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    value="informativo"
                    checked={classification === "informativo"}
                    onChange={() => {
                      setClassification("informativo");
                      setSyncCalendar(false);
                    }}
                    className="sr-only"
                  />
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                  <span className="text-xs font-bold">Informativo</span>
                </label>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Asunto del Documento *
              </label>
              <textarea
                required
                rows={3}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Resumen del asunto..."
                id="field-subject"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Notas / Instrucciones adicionales
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Instrucciones internas de turnado, dependencias de apoyo..."
                id="field-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-2xl text-xs transition-colors"
                id="btn-cancel-review"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-2xl text-xs transition-colors shadow-sm flex items-center justify-center space-x-1.5"
                id="btn-submit-registry"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirmar Registro</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Simple loader helper inside code
import { Loader2 } from "lucide-react";
