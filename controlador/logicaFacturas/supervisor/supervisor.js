import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const supervisorRouter = Router();
supervisorRouter.get("/", (req, res) => {
  const { id } = protegerRuta({ req, res });
  try {
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        "Supervisor",
        "SupervisorMain",
        "supervisor.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});
