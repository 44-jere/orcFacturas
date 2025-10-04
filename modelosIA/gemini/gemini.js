import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prompt =
  "Tienes N imágenes de facturas. Devuelve SOLO un **arreglo JSON** donde cada elemento corresponde a una imagen en el mismo orden de entrada. Cada elemento debe tener exactamente estas claves: proveedor, numero_factura, fecha_emision (YYYY-MM-DD), moneda (Q|$), nit_emisor, nit_receptor, total (número),descripcion. Sin texto extra, SOLO el JSON del arreglo. incluye el titulo de la imagen en el json";

function parseJsonArray(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const s = (m ? m[1] : text).trim();
  return JSON.parse(s); // lanza si no es JSON válido
}

// --- Reconstruir __dirname en ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Cargar el archivo .env.gemini desde la misma carpeta ---
dotenv.config({ path: path.join(__dirname, ".env.gemini") });

class ModeloIA {
  constructor() {
    if (ModeloIA.instance) {
      return ModeloIA.instance; // ← devuelve la misma instancia siempre
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    ModeloIA.instance = this;
  }

  /**
   * Analiza una imagen y devuelve JSON con los datos extraídos.
   * @param {Buffer} imageBuffer - Imagen en buffer (png, jpg, etc.)
   * @param {string} mimeType - Tipo MIME (ej. "image/png")
   */
  async analizarImagen(imageBuffer, mimeType = "image/png") {
    const promptSistema = prompt;

    const result = await this.model.generateContent({
      contents: [
        { role: "user", parts: [{ text: promptSistema }] },
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();

    try {
      return JSON.parse(text);
    } catch {
      return { error: "Modelo no devolvió JSON válido", raw: text };
    }
  }
  async analizarImagenes(files) {
    const promptSistema = prompt;

    // Combina prompt + todas las imágenes en **una sola** parts[]
    const parts = [
      { text: promptSistema },
      ...files.map((f) => ({
        inlineData: {
          mimeType: f.mimetype,
          data: f.buffer.toString("base64"),
        },
      })),
    ];

    const result = await this.model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    try {
      const arr = parseJsonArray(text);
      return Array.isArray(arr)
        ? arr
        : { error: "No devolvió un arreglo", raw: text };
    } catch {
      return { error: "Modelo no devolvió JSON válido", raw: text };
    }
  }
}

// Exporta siempre la misma instancia
export const modeloIA = new ModeloIA();
