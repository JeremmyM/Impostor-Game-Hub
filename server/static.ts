import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // process.cwd() apunta a la raíz del proyecto en Render (/opt/render/project/src)
  // Esto es mucho más seguro que usar __dirname
  const distPath = path.resolve(process.cwd(), "dist", "public"); 
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `No se encontró el directorio de build: ${distPath}. Asegúrate de que el comando de build generó esta carpeta.`
    );
  }

  app.use(express.static(distPath));

  // Manejador para la Single Page Application (SPA)
  // ¡AQUÍ ESTÁ LA CORRECCIÓN! Cambiamos "*" por "/{*path}"
  app.use("/{*path}", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html no encontrado en el servidor");
    }
  });
}
