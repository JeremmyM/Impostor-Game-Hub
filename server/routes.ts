import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupBot } from "./bot";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Start Telegram bot
  setupBot();

  app.get(api.stats.get.path, async (req, res) => {
    try {
      const stats = await storage.getTotalStats();
      const topPlayers = await storage.getTopPlayers(10);
      res.json({
        totalPlayers: stats.totalPlayers,
        totalGames: stats.totalGames,
        topPlayers
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // NUEVA RUTA: Recibe la orden del botón para borrar los datos
  app.post("/api/reset", async (req, res) => {
    try {
      await storage.resetAllStats();
      res.json({ success: true, message: "Ranking reiniciado" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error al reiniciar" });
    }
  });

  // ¡HEMOS ELIMINADO EL CÓDIGO QUE CREABA JUGADORES FALSOS!

  return httpServer;
}
