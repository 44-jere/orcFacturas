// db.js
import pkg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga el .env que está JUNTO a baseDeDatos.js
dotenv.config({ path: path.join(__dirname, ".env.dbConection") });

const { Pool } = pkg;

class BaseDeDatos {
  static #instancia = null; // propiedad privada

  constructor() {
    if (BaseDeDatos.#instancia) return BaseDeDatos.#instancia;

    // Validar configuración
    const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`❌ Falta variable de entorno: ${key}`);
      }
    }

    // Crear pool de conexiones (mejor que Client para apps web)
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME,
      max: 12, // número máximo de conexiones
      idleTimeoutMillis: 10_000, // cerrar conexiones inactivas
    });

    BaseDeDatos.#instancia = this;
  }

  static obtenerInstancia() {
    return BaseDeDatos.#instancia ?? new BaseDeDatos();
  }

  async query(text, params = []) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(text, params);
      return res;
    } catch (err) {
      console.error("❌ Error en query:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async desconectar() {
    await this.pool.end();
    console.log("🔒 Pool de conexiones cerrado");
  }
}

export const baseDeDatos = new BaseDeDatos();
import "./login/get/get.js";
import "./perfil/post/post.js";

import "./administrador/post/post.js";
import "./administrador/get/get.js";
import "./administrador/patch/patch.js";

import "./mainFacturas/post/post.js";

import "./usermain/get/get.js";
