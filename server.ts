import express from "express";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { JWT } from "google-auth-library";

// Load environment variables
dotenv.config();

// Bridge server-side FIRESTORE_DATABASE_ID to VITE_FIRESTORE_DATABASE_ID so Vite server picks it up
if (process.env.FIRESTORE_DATABASE_ID) {
  process.env.VITE_FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;
}

const app = express();
const PORT = 3000;

// Expose runtime public configurations to the client
app.get("/api/config", (req, res) => {
  res.json({
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || "(default)"
  });
});

// Set up memory storage for multer to handle uploaded files safely in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// API endpoint to process the uploaded document using Gemini
app.post("/api/process-document", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo PDF." });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "El archivo debe ser un PDF válido." });
    }

    // Parse the other form fields
    const lastFolioNumber = parseInt(req.body.lastFolioNumber || "0", 10);
    const directoryJson = req.body.directory || "[]";
    let directoryContacts = [];
    try {
      directoryContacts = JSON.parse(directoryJson);
    } catch (e) {
      console.error("Error parsing directory JSON:", e);
    }

    const fileBase64 = req.file.buffer.toString("base64");

    // Initialize Gemini client
    const ai = getGeminiClient();

    // Instruct Gemini to extract precise entities
    const prompt = `
      Eres un asistente experto para Oficialía de Partes en la administración pública.
      Analiza el documento PDF adjunto y extrae de forma precisa los siguientes metadatos structured JSON:
      
      - doc_number: Número del oficio oficial (por ejemplo: 'DG-125-2026', 'OFICIO-024/2026', 'S/N' si no tiene número).
      - sender_name: Nombre completo de la persona que envía/firma el documento (por ejemplo: 'Lic. Juan Pérez Gómez').
      - sender_title: Cargo o puesto del remitente (por ejemplo: 'Director de Finanzas').
      - sender_organization: Institución, empresa o dependencia del remitente (por ejemplo: 'Secretaría de Gobernación').
      - recipient_name: Nombre de la persona o titular a quien va dirigido el oficio (por ejemplo: 'Ing. María Rodríguez').
      - recipient_title: Cargo o puesto del destinatario (por ejemplo: 'Oficial Mayor').
      - subject: Un resumen claro, conciso y formal del asunto del oficio (máximo 150 caracteres).
      - date_document: La fecha en la que se emitió el oficio (en formato YYYY-MM-DD. Si no tiene o no es clara, estimar o retornar null).
      - due_date: La fecha límite de respuesta, plazo de vencimiento, término o fecha crítica mencionada en el oficio para realizar alguna acción o dar respuesta (en formato YYYY-MM-DD. Si no se menciona o no aplica, retornar null).
      - classification: Clasificar entre 'requiere_accion' o 'informativo'. 
        * Usa 'requiere_accion' si el oficio solicita una respuesta formal, convoca a reuniones específicas, requiere dar seguimiento o trámite, fija plazos de entrega, o pide acciones legislativas/administrativas concretas.
        * Usa 'informativo' si es para su conocimiento general, circulares de rutina, invitaciones informales, saludos, o acuses de recibo que no conllevan ninguna tarea o seguimiento.

      Lista de contactos del directorio institucional actual para cotejar y proponer coincidencias:
      ${JSON.stringify(directoryContacts, null, 2)}

      Si el remitente coincide con alguno de la lista (por nombre o cargo similar), inclúyelo en:
      - matched_sender_id: El 'contact_id' o ID del contacto que coincide del directorio, o null si no hay coincidencia clara.
      
      Retorna estrictamente el objeto JSON solicitado que cumpla con el siguiente esquema:
      {
        "doc_number": "string",
        "sender_name": "string",
        "sender_title": "string",
        "sender_organization": "string",
        "recipient_name": "string",
        "recipient_title": "string",
        "subject": "string",
        "date_document": "string | null",
        "due_date": "string | null",
        "classification": "requiere_accion" | "informativo",
        "matched_sender_id": "string | null"
      }
    `;

    // Execute Gemini API call with structured JSON output response
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: fileBase64,
            mimeType: "application/pdf"
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No se obtuvo respuesta de procesamiento del modelo Gemini.");
    }

    let extractedData;
    try {
      extractedData = JSON.parse(responseText.trim());
    } catch (e) {
      console.error("Failed to parse Gemini response text:", responseText);
      throw new Error("La respuesta de la IA no tiene un formato JSON válido.");
    }

    // Calculate next folio ID
    const nextFolioNumber = lastFolioNumber + 1;
    const currentYear = new Date().getFullYear();
    const folioId = `OP-${currentYear}-${String(nextFolioNumber).padStart(4, "0")}`;

    // Add calculations to response
    const result = {
      ...extractedData,
      folio_id: folioId,
      nextFolioNumber,
      date_reception: new Date().toISOString().split("T")[0],
      time_reception: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
    };

    return res.json(result);
  } catch (error: any) {
    console.error("Error processing document:", error);
    return res.status(500).json({
      error: error.message || "Error interno al procesar el oficio por IA."
    });
  }
});

// Google Calendar Event Syncing Endpoint
app.post("/api/sync-calendar", async (req, res) => {
  try {
    const { doc_number, subject, due_date, pdf_url } = req.body;

    if (!due_date) {
      return res.status(400).json({ error: "La fecha de vencimiento es obligatoria para agendar." });
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    if (!email || !key) {
      console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no están configurados.");
      return res.status(400).json({
        error: "Las credenciales del calendario institucional (Service Account) no están configuradas en el servidor. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
      });
    }

    const authClient = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
    });

    const tokenInfo = await authClient.getAccessToken();
    if (!tokenInfo.token) {
      throw new Error("No se pudo obtener el token de acceso para la cuenta de servicio.");
    }

    // Call Google Calendar API to insert an event
    const eventBody = {
      summary: `Oficio Pendiente: ${doc_number || "S/N"}`,
      description: `Asunto: ${subject}\n\nEnlace al PDF: ${pdf_url || "No disponible"}`,
      start: {
        date: due_date // "YYYY-MM-DD"
      },
      end: {
        date: due_date // "YYYY-MM-DD"
      }
    };

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenInfo.token}`
        },
        body: JSON.stringify(eventBody)
      }
    );

    if (!calendarResponse.ok) {
      const errText = await calendarResponse.text();
      console.error("Google Calendar API error:", errText);
      throw new Error(`Google Calendar API respondió con código ${calendarResponse.status}: ${errText}`);
    }

    const calendarData = await calendarResponse.json();
    return res.json({
      success: true,
      eventId: calendarData.id,
      htmlLink: calendarData.htmlLink
    });
  } catch (err: any) {
    console.error("Error syncing to Google Calendar:", err);
    return res.status(500).json({
      error: err.message || "Error al sincronizar con Google Calendar."
    });
  }
});


// Configure Vite middleware or static assets serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
