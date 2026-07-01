import React, { useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  Users,
  Plus,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Inbox,
  Award
} from "lucide-react";
import { IncomingDocument, Contact } from "../types";

interface DashboardProps {
  documents: IncomingDocument[];
  directory: Contact[];
  onUploadClick: () => void;
  onAddContact: (contact: Omit<Contact, "contact_id">) => Promise<void>;
}

export default function Dashboard({ documents, directory, onUploadClick, onAddContact }: DashboardProps) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactOrg, setNewContactOrg] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  // Statistics
  const totalReceived = documents.length;
  const totalPending = documents.filter((d) => (d.status || "pendiente") === "pendiente").length;
  const totalAtendido = documents.filter((d) => d.status === "atendido").length;
  const totalArchived = documents.filter((d) => d.status === "archivado").length;

  const requiresActionCount = documents.filter((d) => d.classification === "requiere_accion").length;
  const informativeCount = documents.filter((d) => d.classification === "informativo").length;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactOrg) {
      setContactError("El nombre y la organización son obligatorios.");
      return;
    }

    try {
      setContactError("");
      await onAddContact({
        name: newContactName,
        title: newContactTitle,
        organization: newContactOrg
      });
      setContactSuccess("Contacto agregado exitosamente al directorio.");
      setNewContactName("");
      setNewContactTitle("");
      setNewContactOrg("");
      setTimeout(() => setContactSuccess(""), 3000);
    } catch (err: any) {
      setContactError("Error al agregar contacto: " + err.message);
    }
  };

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid">
        {/* Total Documents */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Recibidos</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-slate-800" id="stat-total">{totalReceived}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold">Activo</span>
          </div>
        </div>

        {/* Pending Action */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans">Requiere Acción</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-amber-700" id="stat-pending">{requiresActionCount}</span>
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
          </div>
        </div>

        {/* Informative Only */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Informativos</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-slate-800" id="stat-informative">{informativeCount}</span>
            <span className="text-xs text-slate-500 font-mono">Clasificados</span>
          </div>
        </div>

        {/* Atendidos & Archivados */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atendidos / Archivados</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-black text-slate-800" id="stat-archived">
              {totalAtendido} <span className="text-sm font-medium text-slate-400">/ {totalArchived}</span>
            </span>
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg font-bold">Historial</span>
          </div>
        </div>
      </div>

      {/* Main Panel grid: Left side - Call to action + Recents, Right side - Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions & Recents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Action Banner */}
          <div className="bg-indigo-600 border-2 border-indigo-700 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="space-y-2 text-center md:text-left z-10">
              <h2 className="text-xl font-bold tracking-tight">Oficialía de Partes Digital con IA</h2>
              <p className="text-sm text-indigo-100 max-w-md leading-relaxed">
                Automatiza la recepción y registro de oficios en PDF. Nuestro sistema de Inteligencia Artificial extraerá automáticamente remitentes, fechas, folios, asuntos y prioridades.
              </p>
            </div>
            <button
              onClick={onUploadClick}
              className="bg-white text-indigo-800 hover:bg-indigo-50 font-bold px-5 py-3 rounded-xl transition-all duration-300 flex items-center shrink-0 shadow-md transform hover:scale-[1.02] active:scale-100 z-10"
              id="btn-trigger-upload-view"
            >
              <Plus className="h-5 w-5 mr-1.5" />
              Cargar Oficio Nuevo
            </button>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
              <FileText className="h-64 w-64" />
            </div>
          </div>

          {/* Quick instructions / Help */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
              <Award className="h-4 w-4 mr-1.5 text-indigo-500" />
              ¿Cómo funciona el proceso de oficialía inteligente?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="space-y-1 border-l-2 border-indigo-500 pl-3">
                <p className="font-bold text-slate-800">1. Cargar el PDF</p>
                <p className="leading-relaxed">Arrastra o selecciona el oficio escaneado. Admite firmas y formatos administrativos.</p>
              </div>
              <div className="space-y-1 border-l-2 border-indigo-500 pl-3">
                <p className="font-bold text-slate-800">2. Análisis de IA</p>
                <p className="leading-relaxed">Gemini 2.5 procesa el documento, extrae metadatos y los coteja contra tu directorio.</p>
              </div>
              <div className="space-y-1 border-l-2 border-indigo-500 pl-3">
                <p className="font-bold text-slate-800">3. Validar y Guardar</p>
                <p className="leading-relaxed">Verifica los datos en la pantalla dividida, edítalos si es necesario y confirma para registrar.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Panel */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col space-y-4" id="directory-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <Users className="h-4 w-4 mr-1.5 text-indigo-600" />
              Directorio Institucional
            </h3>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center transition-colors"
              id="toggle-add-contact-form"
            >
              {showAddContact ? "Cerrar" : "Agregar"}
            </button>
          </div>

          {/* Add Contact Form */}
          {showAddContact && (
            <form onSubmit={handleContactSubmit} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs animate-fadeIn">
              <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1">Nuevo Contacto</div>
              
              <div>
                <label className="block text-slate-500 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dr. Armando Guerra"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Cargo / Título</label>
                <input
                  type="text"
                  placeholder="Ej. Secretario General"
                  value={newContactTitle}
                  onChange={(e) => setNewContactTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Institución / Dependencia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rectoría UAM"
                  value={newContactOrg}
                  onChange={(e) => setNewContactOrg(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {contactError && <p className="text-rose-600 font-bold">{contactError}</p>}
              {contactSuccess && <p className="text-emerald-600 font-bold">{contactSuccess}</p>}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded transition-colors"
                id="submit-new-contact-btn"
              >
                Registrar Contacto
              </button>
            </form>
          )}

          {/* Directory Contact List */}
          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2.5 pr-1">
            {directory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">El directorio de consulta está vacío.</p>
            ) : (
              directory.map((contact) => (
                <div key={contact.contact_id} className="border border-slate-100 hover:border-slate-200 bg-slate-50/40 p-3 rounded-2xl flex items-start space-x-3 text-xs" id={`contact-${contact.contact_id}`}>
                  <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{contact.name}</p>
                    <p className="text-slate-500 mt-0.5 truncate">{contact.title || "Remitente Registrado"}</p>
                    <div className="inline-flex items-center text-[10px] text-indigo-800 font-semibold px-1.5 py-0.5 bg-indigo-50 rounded mt-1.5 border border-indigo-100">
                      <Building className="h-2.5 w-2.5 mr-1" />
                      {contact.organization}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
