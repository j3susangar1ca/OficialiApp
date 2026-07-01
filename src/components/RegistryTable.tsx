import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  FileDown,
  Trash2,
  CheckCircle,
  Archive,
  Clock,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { IncomingDocument } from "../types";

interface RegistryTableProps {
  documents: IncomingDocument[];
  onUpdateStatus: (docId: string, newStatus: "pendiente" | "atendido" | "archivado") => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
  onSyncCalendar?: (doc: IncomingDocument) => Promise<any>;
}

export default function RegistryTable({ documents, onUpdateStatus, onDelete, onSyncCalendar }: RegistryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<"all" | "requiere_accion" | "informativo">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendiente" | "atendido" | "archivado">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);

  const handleManualSync = async (doc: IncomingDocument) => {
    if (!onSyncCalendar) return;
    setSyncingDocId(doc.id || null);
    try {
      await onSyncCalendar(doc);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingDocId(null);
    }
  };

  const getDueDateIndicator = (dueDateStr: string | null | undefined) => {
    if (!dueDateStr) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(dueDateStr + "T00:00:00");
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return {
          text: `Vencido hace ${Math.abs(diffDays)} d`,
          colorClass: "text-rose-700 bg-rose-50 border-rose-200",
          urgent: true,
        };
      } else if (diffDays === 0) {
        return {
          text: "Vence HOY",
          colorClass: "text-rose-700 bg-rose-100 border-rose-300 animate-pulse",
          urgent: true,
        };
      } else if (diffDays === 1) {
        return {
          text: "Vence MAÑANA",
          colorClass: "text-rose-600 bg-rose-50 border-rose-200",
          urgent: true,
        };
      } else if (diffDays <= 2) {
        return {
          text: `Falta poco (${diffDays} d)`,
          colorClass: "text-amber-700 bg-amber-50 border-amber-200",
          urgent: true,
        };
      } else {
        return {
          text: `Vence el ${dueDateStr}`,
          colorClass: "text-indigo-700 bg-indigo-50 border-indigo-100",
          urgent: false,
        };
      }
    } catch (e) {
      return {
        text: `Vence el ${dueDateStr}`,
        colorClass: "text-slate-700 bg-slate-50 border-slate-200",
        urgent: false,
      };
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.folio_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doc_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClassification =
      classificationFilter === "all" || doc.classification === classificationFilter;

    const matchesStatus =
      statusFilter === "all" || (doc.status || "pendiente") === statusFilter;

    const matchesDate = !dateFilter || doc.date_reception === dateFilter;

    return matchesSearch && matchesClassification && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string = "pendiente") => {
    switch (status) {
      case "atendido":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Atendido
          </span>
        );
      case "archivado":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Archive className="h-3.5 w-3.5 mr-1 text-slate-600" />
            Archivado
          </span>
        );
      case "pendiente":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />
            Pendiente
          </span>
        );
    }
  };

  const getClassificationBadge = (classification: "requiere_accion" | "informativo") => {
    if (classification === "requiere_accion") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          ⚠️ Requiere Acción
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-950 border border-emerald-300">
        ℹ️ Informativo
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden" id="registry-table-root">
      {/* Controls & Filters Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por folio, remitente, asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-white border-2 border-slate-200 rounded-2xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="registry-search-input"
            />
          </div>

          {/* Classification Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={classificationFilter}
              onChange={(e: any) => setClassificationFilter(e.target.value)}
              className="w-full text-xs bg-white border-2 border-slate-200 rounded-2xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="registry-classification-select"
            >
              <option value="all">Todas las clasificaciones</option>
              <option value="requiere_accion">⚠️ Requiere Acción</option>
              <option value="informativo">ℹ️ Informativo</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-white border-2 border-slate-200 rounded-2xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="registry-status-select"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">🕒 Pendiente</option>
              <option value="atendido">✓ Atendido</option>
              <option value="archivado">📁 Archivado</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full text-xs bg-white border-2 border-slate-200 rounded-2xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="registry-date-filter"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center space-y-3" id="empty-registry-state">
            <Search className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">No se encontraron oficios</p>
              <p className="text-xs text-slate-400 mt-1">Prueba a ajustar tus filtros de búsqueda o registra un nuevo oficio.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="registry-table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="py-3.5 px-5">Folio / Documento</th>
                <th className="py-3.5 px-5">Remitente / Origen</th>
                <th className="py-3.5 px-5">Asunto</th>
                <th className="py-3.5 px-5">Fechas</th>
                <th className="py-3.5 px-5">Vencimiento / Calendario</th>
                <th className="py-3.5 px-5">Clasificación / Estado</th>
                <th className="py-3.5 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredDocuments.map((doc) => {
                const docId = doc.id || "";
                return (
                  <tr key={doc.folio_id} className="hover:bg-slate-50/50 transition-colors" id={`row-${doc.folio_id}`}>
                    {/* Folio & Doc Number */}
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-indigo-600">{doc.folio_id}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-medium">Oficio: {doc.doc_number}</div>
                    </td>

                    {/* Sender details */}
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-800">{doc.sender_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {doc.sender_title ? `${doc.sender_title} • ` : ""}
                        <span className="font-medium text-slate-600">{doc.sender_organization || "Remitente Externo"}</span>
                      </div>
                    </td>

                    {/* Subject & Recipient */}
                    <td className="py-4 px-5 max-w-xs">
                      <div className="line-clamp-2 font-medium text-slate-800 leading-snug">{doc.subject}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center">
                        <span>Para: {doc.recipient_name} {doc.recipient_title ? `(${doc.recipient_title})` : ""}</span>
                      </div>
                    </td>

                    {/* Reception Dates */}
                    <td className="py-4 px-5 whitespace-nowrap text-xs">
                      <div className="flex flex-col space-y-0.5">
                        <span><span className="text-slate-400 font-medium">Emisión:</span> {doc.date_document}</span>
                        <span>
                          <span className="text-slate-400 font-medium">Recibido:</span> {doc.date_reception}{" "}
                          <span className="text-slate-400 font-mono">({doc.time_reception})</span>
                        </span>
                      </div>
                    </td>

                    {/* Vencimiento / Calendario */}
                    <td className="py-4 px-5">
                      {doc.due_date ? (
                        <div className="flex flex-col space-y-1">
                          {(() => {
                            const indicator = getDueDateIndicator(doc.due_date);
                            return indicator ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${indicator.colorClass}`}>
                                <Calendar className="h-3 w-3 mr-1 shrink-0" />
                                {indicator.text}
                              </span>
                            ) : null;
                          })()}
                          
                          {doc.calendar_event_id ? (
                            <span className="inline-flex items-center text-[10px] text-emerald-700 font-bold" title="Sincronizado exitosamente con Google Calendar">
                              <CheckCircle className="h-3 w-3 mr-1 text-emerald-500 shrink-0" />
                              Sincronizado
                            </span>
                          ) : doc.classification === "requiere_accion" ? (
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="inline-flex items-center text-[10px] text-rose-600 font-bold" title="No se ha sincronizado con Google Calendar">
                                <AlertCircle className="h-3 w-3 mr-1 text-rose-500 shrink-0" />
                                Sin Agendar
                              </span>
                              {onSyncCalendar && (
                                <button
                                  onClick={() => handleManualSync(doc)}
                                  disabled={syncingDocId === docId}
                                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold px-1.5 py-0.5 rounded transition-colors flex items-center shadow-xs"
                                  title="Sincronizar manualmente con Google Calendar"
                                  id={`sync-btn-${doc.folio_id}`}
                                >
                                  {syncingDocId === docId ? "..." : "Reintentar"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">No requiere agendar</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No asignado</span>
                      )}
                    </td>

                    {/* Classification and action status */}
                    <td className="py-4 px-5 space-y-1.5">
                      <div>{getClassificationBadge(doc.classification)}</div>
                      <div>{getStatusBadge(doc.status)}</div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        {/* PDF link */}
                        {doc.pdf_url && (
                          <a
                              href={doc.pdf_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver PDF Oficial"
                              id={`view-pdf-${doc.folio_id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}

                        {/* Status transition dropdown actions */}
                        <div className="relative group">
                          <button
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Actualizar Estado de Trámite"
                            id={`status-dropdown-trigger-${doc.folio_id}`}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          {/* Hover action menu */}
                          <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 text-left text-xs z-50 hidden group-hover:block w-36">
                            <button
                              onClick={() => onUpdateStatus(docId, "pendiente")}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center text-amber-800"
                            >
                              <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              Marcar Pendiente
                            </button>
                            <button
                              onClick={() => onUpdateStatus(docId, "atendido")}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center text-emerald-800"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              Marcar Atendido
                            </button>
                            <button
                              onClick={() => onUpdateStatus(docId, "archivado")}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center text-slate-800"
                            >
                              <Archive className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              Archivar Oficio
                            </button>
                          </div>
                        </div>

                        {/* Delete */}
                        {showDeleteConfirmId === docId ? (
                          <div className="flex items-center space-x-1 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                            <span className="text-[10px] text-rose-700 font-bold">¿Borrar?</span>
                            <button
                              onClick={() => {
                                onDelete(docId);
                                setShowDeleteConfirmId(null);
                              }}
                              className="text-[10px] bg-rose-600 text-white font-bold px-1 rounded hover:bg-rose-700"
                              id={`confirm-delete-${doc.folio_id}`}
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirmId(null)}
                              className="text-[10px] bg-gray-300 text-gray-700 px-1 rounded hover:bg-gray-400"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirmId(docId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar Registro"
                            id={`btn-delete-${doc.folio_id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center" id="registry-table-footer">
        <span>Mostrando {filteredDocuments.length} de {documents.length} oficios registrados</span>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
          <span>Acción Requerida</span>
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block ml-3"></span>
          <span>Informativo</span>
        </div>
      </div>
    </div>
  );
}
