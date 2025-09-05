// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.dbConection" });

const { Client } = pkg;

export class baseDeDatos {
  static instancia; // propiedad estática

  constructor() {
    if (baseDeDatos.instancia) {
      return baseDeDatos.instancia; // devuelve la ya creada
    }

    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    baseDeDatos.instancia = this; // guarda instancia única
  }

  async conectar() {
    if (!this.client._connected) {
      try {
        await this.client.connect();
        console.log("✅ Conexión única a PostgreSQL establecida");
      } catch (err) {
        console.error("❌ Error al conectar:", err.message);
      }
    }
    return this.client;
  }

  async desconectar() {
    if (this.client._connected) {
      await this.client.end();
      console.log("🔒 Conexión cerrada");
    }
  }
}
