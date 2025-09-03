// conectar.js
const { Client } = require("pg");

async function main() {
  const client = new Client();

  try {
    await client.connect();
    console.log("✅ Conexión exitosa a PostgreSQL");

    const resultado = await client.query("SELECT NOW()");
    console.log("🕒 Hora actual en el servidor:", resultado.rows[0].now);
  } catch (err) {
    console.error("❌ Error al conectar o consultar:", err.message);
  } finally {
    await client.end();
    console.log("🔒 Conexión cerrada");
  }
}

main();
