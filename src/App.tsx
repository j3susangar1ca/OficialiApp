import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  db,
  storage,
  signInWithPopup,
  signOut
} from "./firebase";
import {
  onAuthStateChanged,
  signInAnonymously,
  User as FirebaseUser
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  FolderOpen,
  LayoutDashboard,
  FileSpreadsheet,
  LogOut,
  Sparkles,
  User,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Compass,
  FileCheck2,
  HelpCircle,
  CheckCircle
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import FileUploader from "./components/FileUploader";
import ReviewForm from "./components/ReviewForm";
import RegistryTable from "./components/RegistryTable";
import { Contact, IncomingDocument, UserProfile } from "./types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Seed data if directory is empty
const INITIAL_DIRECTORY_SEED: Omit<Contact, "contact_id">[] = [
  {
    name: "Lic. Juan Carlos López",
    title: "Director General de Presupuesto",
    organization: "Secretaría de Hacienda y Crédito Público (SHCP)"
  },
  {
    name: "Dra. Sofía Galván",
    title: "Secretaria Particular de Coordinación",
    organization: "Cámara de Diputados - Junta de Coordinación Política"
  },
  {
    name: "Mtro. Alejandro Benítez",
    title: "Oficial Mayor Administrativo",
    organization: "Secretaría de Educación Pública (SEP)"
  },
  {
    name: "Ing. Ernesto Villalobos",
    title: "Coordinador de Infraestructura Hidráulica",
    organization: "Comisión Nacional del Agua (CONAGUA)"
  },
  {
    name: "Lic. Gabriela Solís",
    title: "Directora de Asuntos Jurídicos",
    organization: "Comisión Federal de Electricidad (CFE)"
  }
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "upload" | "review">("dashboard");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Firestore collections states
  const [documents, setDocuments] = useState<IncomingDocument[]>([]);
  const [directory, setDirectory] = useState<Contact[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // Active analysis upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // 1. Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile: UserProfile;
        if (firebaseUser.isAnonymous) {
          const cachedUserStr = localStorage.getItem("sandbox_user");
          const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
          profile = {
            uid: firebaseUser.uid,
            email: cachedUser?.email || "oficina.partes@institucion.gob.mx",
            name: cachedUser?.name || "Lic. Alejandro Montes"
          };
        } else {
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "usuario@oficialia.gob.mx",
            name: firebaseUser.displayName || "Personal de Oficialía"
          };
        }
        setUser(profile);

        // Sync user in firestore 'users' collection
        try {
          await setDoc(doc(db, "users", profile.uid), profile, { merge: true });
        } catch (err) {
          console.error("Error saving user profile:", err);
          handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        }
      } else {
        // Check if there is a cached local session (sandbox bypass fallback)
        const cachedUser = localStorage.getItem("sandbox_user");
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        } else {
          setUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Firestore Data (Real-time subscriptions)
  useEffect(() => {
    if (!user) return;

    // Load Documents Collection
    setDocumentsLoading(true);
    const qDocs = query(collection(db, "incoming_documents"), orderBy("date_reception", "desc"));
    const unsubscribeDocs = onSnapshot(
      qDocs,
      (snapshot) => {
        const docsList: IncomingDocument[] = [];
        snapshot.forEach((firestoreDoc) => {
          docsList.push({ id: firestoreDoc.id, ...firestoreDoc.data() } as IncomingDocument);
        });
        setDocuments(docsList);
        setDocumentsLoading(false);
      },
      (error) => {
        console.error("Firestore loading documents failed:", error);
        showToast("Error de conexión al cargar el historial de oficios.", "error");
        setDocumentsLoading(false);
        handleFirestoreError(error, OperationType.LIST, "incoming_documents");
      }
    );

    // Load Directory Collection
    const unsubscribeDir = onSnapshot(
      collection(db, "directory"),
      (snapshot) => {
        const contactsList: Contact[] = [];
        snapshot.forEach((c) => {
          contactsList.push({ contact_id: c.id, ...c.data() } as Contact);
        });

        // Seed Directory if completely empty
        if (contactsList.length === 0) {
          seedDirectoryDatabase();
        } else {
          setDirectory(contactsList);
        }
      },
      (error) => {
        console.error("Firestore loading directory failed:", error);
        handleFirestoreError(error, OperationType.LIST, "directory");
      }
    );

    return () => {
      unsubscribeDocs();
      unsubscribeDir();
    };
  }, [user]);

  // Seed Helper
  const seedDirectoryDatabase = async () => {
    try {
      console.log("Seeding directory collection with mock administrators...");
      for (const contact of INITIAL_DIRECTORY_SEED) {
        await addDoc(collection(db, "directory"), contact);
      }
    } catch (err) {
      console.error("Failed to seed directory:", err);
      handleFirestoreError(err, OperationType.CREATE, "directory");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessToast(message);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  // Google Authentication Trigger
  const handleGoogleSignIn = async () => {
    try {
      setErrorToast(null);
      await signInWithPopup(auth, googleProvider);
      showToast("¡Sesión iniciada exitosamente!", "success");
    } catch (err: any) {
      console.error("Auth error:", err);
      // Fallback hint for standard browser iframe cookie blocking
      showToast(
        "El navegador bloqueó la ventana emergente de Google. Prueba el 'Acceso Rápido de Pruebas'.",
        "error"
      );
    }
  };

  // Mock Bypass Authentication for iframe environments
  const handleMockSignIn = async () => {
    try {
      const mockProfile: UserProfile = {
        uid: "sandbox-mock-user-12345",
        email: "oficina.partes@institucion.gob.mx",
        name: "Lic. Alejandro Montes"
      };
      localStorage.setItem("sandbox_user", JSON.stringify(mockProfile));
      // Sign in anonymously so that request.auth != null on Firestore rules checks!
      await signInAnonymously(auth);
      showToast("Sesión de Pruebas autorizada (Sandbox)", "success");
    } catch (err: any) {
      console.error("Mock sign in error:", err);
      // Fallback: still set local state so they can test
      const mockProfile: UserProfile = {
        uid: "sandbox-mock-user-12345",
        email: "oficina.partes@institucion.gob.mx",
        name: "Lic. Alejandro Montes"
      };
      setUser(mockProfile);
      showToast("Sesión de Pruebas local iniciada (Bypass)", "success");
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem("sandbox_user");
      await signOut(auth);
      setUser(null);
      setActiveTab("dashboard");
      showToast("Sesión cerrada.", "success");
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // Directory Contact management
  const handleAddContact = async (contact: Omit<Contact, "contact_id">) => {
    try {
      await addDoc(collection(db, "directory"), contact);
      showToast("Remitente agregado al directorio.", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "directory");
    }
  };

  // Upload PDF file to Firebase Storage with local blob fallback for durability
  const uploadDocumentPDF = async (file: File, folioId: string): Promise<string> => {
    try {
      const storageRef = ref(storage, `documents/${folioId}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      return downloadURL;
    } catch (error) {
      console.warn("Storage upload failed, falling back to durable blob / base64 string:", error);
      // Return local FileReader Data URL as a failover URL. This means the app is 100% immune to storage initialization errors.
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  };

  // AI document processing handler
  const handleFileAnalyzed = (file: File, resultData: any) => {
    setUploadedFile(file);
    setAnalysisResult(resultData);
    setActiveTab("review");
  };

  const handleSyncCalendar = async (docObj: IncomingDocument): Promise<string | null> => {
    try {
      if (!docObj.due_date) {
        showToast("El oficio no tiene una fecha de vencimiento válida para agendar.", "error");
        return null;
      }

      const response = await fetch("/api/sync-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_number: docObj.doc_number,
          subject: docObj.subject,
          due_date: docObj.due_date,
          pdf_url: docObj.pdf_url,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al sincronizar con el calendario institucional.");
      }

      const data = await response.json();
      const eventId = data.eventId;

      // If the document is already in Firestore, update it!
      if (docObj.id) {
        const docRef = doc(db, "incoming_documents", docObj.id);
        await updateDoc(docRef, { calendar_event_id: eventId });
      }

      showToast("¡Oficio agendado exitosamente en el Google Calendar Institucional!", "success");
      return eventId;
    } catch (err: any) {
      console.error("Google Calendar Sync error:", err);
      showToast("Calendario no sincronizado: " + err.message, "error");
      return null;
    }
  };

  // Confirm and write validated document to Firestore
  const handleConfirmRegistry = async (finalData: IncomingDocument) => {
    if (!user || !uploadedFile) return;

    try {
      // 1. Upload PDF to Storage/Blob
      const pdfUrl = await uploadDocumentPDF(uploadedFile, finalData.folio_id);

      // 2. Compile final record with calendar_event_id default to null
      const finalDoc: IncomingDocument = {
        ...finalData,
        pdf_url: pdfUrl,
        registered_by: user.name || user.email,
        calendar_event_id: null
      };

      // 3. Sync with Google Calendar if toggled
      if (finalData.sync_calendar && finalData.due_date) {
        showToast("Sincronizando con Google Calendar...", "success");
        const eventId = await handleSyncCalendar(finalDoc);
        if (eventId) {
          finalDoc.calendar_event_id = eventId;
        }
      }

      // 4. Write to Firestore 'incoming_documents'
      try {
        await addDoc(collection(db, "incoming_documents"), finalDoc);
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.CREATE, "incoming_documents");
      }

      showToast(`Oficio registrado con éxito bajo folio: ${finalData.folio_id}`, "success");
      setUploadedFile(null);
      setAnalysisResult(null);
      setActiveTab("history");
    } catch (err: any) {
      console.error("Error saving document:", err);
      showToast("Error al registrar el oficio en Firestore: " + err.message, "error");
      throw err;
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDoc(doc(db, "incoming_documents", docId));
      showToast("Registro de oficio eliminado.", "success");
    } catch (err: any) {
      showToast("Error al eliminar registro: " + err.message, "error");
      handleFirestoreError(err, OperationType.DELETE, `incoming_documents/${docId}`);
    }
  };

  // Update Status of registered oficio
  const handleUpdateStatus = async (docId: string, newStatus: "pendiente" | "atendido" | "archivado") => {
    try {
      const docRef = doc(db, "incoming_documents", docId);
      await updateDoc(docRef, { status: newStatus });
      showToast(`Trámite actualizado a: ${newStatus.toUpperCase()}`, "success");
    } catch (err: any) {
      showToast("Error al actualizar estado: " + err.message, "error");
      handleFirestoreError(err, OperationType.UPDATE, `incoming_documents/${docId}`);
    }
  };

  // Get max folio number to support incremental generation
  const getMaxFolioNumber = (): number => {
    let max = 0;
    documents.forEach((doc) => {
      if (doc.folio_id) {
        // parse 'OP-YYYY-XXXX'
        const parts = doc.folio_id.split("-");
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
      }
    });
    return max;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="relative">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl animate-spin">
            <Loader2 className="h-10 w-10" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800">Oficialía de Partes Digital</h3>
          <p className="text-xs text-gray-500 mt-1">Verificando credenciales de acceso institucional...</p>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans border-8 border-white rounded-[40px] shadow-2xl" id="login-screen">
        <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          {/* Brand header */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-8 text-center relative">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
              <Building2 className="h-40 w-40" />
            </div>
            
            <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-xs">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Oficialía <span className="text-indigo-200 underline decoration-indigo-300 underline-offset-4">Digital</span></h1>
            <p className="text-xs text-indigo-100 mt-1.5 font-medium uppercase tracking-wider">
              Módulo de Recepción Inteligente de Oficios
            </p>
          </div>

          {/* Form details */}
          <div className="p-8 space-y-6 flex-1">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold text-slate-800">Autenticación Obligatoria</h2>
              <p className="text-xs text-slate-400">
                El acceso a este sistema está estrictamente restringido a personal administrativo autorizado de la Oficialía.
              </p>
            </div>

            {errorToast && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded-r-lg flex items-start space-x-1.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorToast}</span>
              </div>
            )}

            <div className="space-y-3" id="auth-actions">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center space-x-2"
                id="btn-google-login"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.85 3C6.35 7.55 9 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.47-1.11 2.71-2.36 3.55l3.65 2.83c2.14-1.97 3.4-4.88 3.4-8.48z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.35 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9c-.8 1.6-1.25 3.4-1.25 5.3s.45 3.7 1.25 5.3l3.85-3z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.11.75-2.52 1.19-4.31 1.19-3 0-5.65-2.51-6.56-5.46L1.5 15.99C3.4 19.85 7.35 23 12 23z"
                  />
                </svg>
                <span>Acceder con cuenta Google</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Entorno Sandbox
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Sandbox bypass login */}
              <button
                onClick={handleMockSignIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2"
                id="btn-sandbox-login"
              >
                <Lock className="h-4 w-4 text-white" />
                <span>Acceso Rápido de Pruebas</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 mr-1" />
              Conexión Encriptada
            </span>
            <span>Versión 2.0 (Gemini 2.5)</span>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN PORTAL VIEW
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 border-8 border-white rounded-[40px] shadow-2xl p-6" id="authenticated-portal">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border border-emerald-500 animate-slideIn">
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs">{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border border-rose-500 animate-slideIn">
          <AlertCircle className="h-5 w-5" />
          <span className="text-xs">{errorToast}</span>
        </div>
      )}

      {/* Main Header */}
      <header className="flex items-center justify-between mb-6 px-2 sticky top-0 z-40" id="app-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Oficialía<span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4 ml-1">Digital</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gobierno Digital e Innovación Tecnológica</p>
          </div>
        </div>

        {/* User profile dropdown and active system state */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="bg-white border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-600">Sistemas Activos</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[9px] text-slate-400 font-mono">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-sm">
              {user.name ? user.name.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase() : "AD"}
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Cerrar Sesión"
              id="btn-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <nav className="bg-white border-2 border-slate-200 rounded-3xl p-2 flex items-center justify-between overflow-x-auto whitespace-nowrap mb-6 shadow-xs" id="app-nav">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
            id="tab-dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Principal</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
            id="tab-history"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Historial de Oficios</span>
            {documents.length > 0 && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === "history" ? "bg-white text-indigo-600" : "bg-slate-100 text-slate-800"
              }`}>
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "upload"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
            id="tab-upload"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Cargar Nuevo PDF</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 pr-2">
          <span className="font-medium">Año Fiscal:</span>
          <span className="font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
            {new Date().getFullYear()}
          </span>
        </div>
      </nav>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto" id="app-main-content">
        {activeTab === "dashboard" && (
          <Dashboard
            documents={documents}
            directory={directory}
            onUploadClick={() => setActiveTab("upload")}
            onAddContact={handleAddContact}
          />
        )}

        {activeTab === "upload" && (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-gray-800">Recepción de Documento con IA</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Selecciona o arrastra el archivo de oficio en formato PDF. La Inteligencia Artificial de Gemini analizará automáticamente la imagen y el texto del documento para sugerir los campos requeridos para su validación oficial.
              </p>
            </div>
            <FileUploader
              onFileAnalyzed={handleFileAnalyzed}
              lastFolioNumber={getMaxFolioNumber()}
              directoryContacts={directory}
            />
          </div>
        )}

        {activeTab === "review" && uploadedFile && analysisResult && (
          <ReviewForm
            file={uploadedFile}
            analysisData={analysisResult}
            directoryContacts={directory}
            onCancel={() => {
              setUploadedFile(null);
              setAnalysisResult(null);
              setActiveTab("upload");
            }}
            onConfirm={handleConfirmRegistry}
          />
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Control de Oficios Recibidos</h2>
                <p className="text-xs text-gray-500">Historial completo de correspondencia turnada por orden cronológico.</p>
              </div>
              <button
                onClick={() => setActiveTab("upload")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors self-start sm:self-center"
                id="btn-new-from-history"
              >
                Cargar Oficio Nuevo
              </button>
            </div>

            {documentsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3 bg-white rounded-2xl border border-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-xs">Sincronizando con base de datos de Oficialía...</p>
              </div>
            ) : (
              <RegistryTable
                documents={documents}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteDocument}
                onSyncCalendar={handleSyncCalendar}
              />
            )}
          </div>
        )}
      </main>

      {/* App Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 px-6 text-center text-xs text-gray-400 font-medium">
        <span>© {new Date().getFullYear()} Oficialía de Partes Inteligente • Gobierno Digital • Desarrollado con tecnología de Inteligencia Artificial Gemini</span>
      </footer>
    </div>
  );
}
