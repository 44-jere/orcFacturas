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

class BaseDeDatos {
  static instancia; // propiedad estática para el singleton

  constructor() {
    if (BaseDeDatos.instancia) {
      return BaseDeDatos.instancia;
    }

    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME,
    });

    this.conectado = false; // bandera propia
    BaseDeDatos.instancia = this;
  }

  async conectar() {
    if (!this.conectado) {
      try {
        await this.client.connect();
        this.conectado = true;
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

export const baseDeDatos = new BaseDeDatos();
import "./login/get/get.js";
import "./perfil/post/post.js";

import "./administrador/post/post.js";
import "./administrador/get/get.js";
import "./administrador/patch/patch.js";

import "./mainFacturas/post/post.js";
