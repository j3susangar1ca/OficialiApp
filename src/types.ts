export interface UserProfile {
  uid: string;
  email: string;
  name: string;
}

export interface Contact {
  contact_id: string;
  name: string;
  title: string;
  organization: string;
}

export interface IncomingDocument {
  id?: string; // Firestore document ID
  folio_id: string;
  doc_number: string;
  sender_name: string;
  sender_title?: string;
  sender_organization?: string;
  recipient_name: string;
  recipient_title?: string;
  date_document: string; // stored as ISO date string or local date string YYYY-MM-DD
  date_reception: string; // YYYY-MM-DD
  time_reception: string; // HH:MM
  subject: string;
  classification: "requiere_accion" | "informativo";
  pdf_url: string; // PDF Firebase Storage URL
  registered_by: string; // User email or name
  status?: "pendiente" | "atendido" | "archivado"; // helpful status indicator
  notes?: string;
  due_date?: string | null;
  calendar_event_id?: string | null;
  sync_calendar?: boolean;
}
