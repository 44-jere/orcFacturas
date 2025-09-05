// db.js
import pkg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga el .env que está JUNTO a baseDeDatos.js
dotenv.config({ path: path.join(__dirname, ".env.dbConection") });

const { Client } = pkg;

export class baseDeDatos {
  static instancia; // propiedad estática para el singleton

  constructor() {
    if (baseDeDatos.instancia) {
      return baseDeDatos.instancia;
    }

    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME,
    });

    this.conectado = false; // bandera propia
    baseDeDatos.instancia = this;
  }

  async conectar() {
    console.log({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME,
    });
    if (!this.conectado) {
      try {
        await this.client.connect();
        this.conectado = true;
        console.log("✅ Conexión única a PostgreSQL establecida");
      } catch (err) {
        console.error("❌ Error al conectar:", err.message);
      }
    }
    return this.client;
  }

  async desconectar() {
    if (this.conectado) {
      await this.client.end();
      this.conectado = false;
      console.log("🔒 Conexión cerrada");
    }
  }
}
