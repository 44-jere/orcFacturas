import { Router } from "express";
import { __dirname } from "../../../index.js";
import path from "path";

export const loginRouter = Router();

loginRouter.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/login/login.html"))
);

loginRouter.post("/", (req, res) => {});
