import { baseDeDatos } from "../../baseDeDatos.js";
const DB = new baseDeDatos();
const db = await DB.conectar();

const ministerios = await db.query("select * from ministerios");
console.log(ministerios);
// agergarUsuarios
