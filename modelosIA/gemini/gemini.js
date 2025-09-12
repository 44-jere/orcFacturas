import  {GoogleGenerativeAI}  from "@google/generative-ai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prompt =
  "Extrae los datos de esta factura y devuelve SOLO un JSON válido con exactamente estas claves: proveedor, numero_factura, fecha_emision (formato DD/MM/AAAA), moneda (Q para quetzales, $ para dólares), nit_emisor, nit_receptor, total (solo números con decimales). No agregues texto adicional, solo el JSON.";

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
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // Genera lista de imágenes como parts
    const imagesParts = files.map((file) => ({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString("base64"),
      },
    }));

    const result = await this.model.generateContent({
      contents: [
        { role: "user", parts: [{ text: promptSistema }] },
        { role: "user", parts: imagesParts },
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
}

// Exporta siempre la misma instancia
export const modeloIA = new ModeloIA();