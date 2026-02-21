import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupBot } from "./bot";

export async function registerRoutes(
  app: Express,
  httpServer: Server
): Promise<Server> {
  
  // Iniciar el bot de Telegram
  setupBot();

  // Obtener todos los jugadores (Ranking Global)
  app.get("/api/players", async (_req, res) => {
    try {
      const topPlayers = await storage.getTopPlayers(50);
      res.json(topPlayers);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error al obtener jugadores globales" });
    }
  });

  // NUEVA RUTA: Obtener jugadores de un grupo específico (Ranking Individual)
  app.get("/api/players/chat/:chatId", async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const topPlayers = await storage.getTopPlayersByChat(chatId, 50);
      res.json(topPlayers);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error al obtener ranking del grupo" });
    }
  });

  // Estadísticas generales (opcional para dashboard)
  app.get("/api/stats", async (_req, res) => {
    try {
      // Nota: Asegúrate de que getTotalStats existe en tu storage.ts
      const stats = await storage.getTotalStats?.() || { totalPlayers: 0, totalGames: 0 };
      const topPlayers = await storage.getTopPlayers(10);
      res.json({
        totalPlayers: stats.totalPlayers,
        totalGames: stats.totalGames,
        topPlayers
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Reiniciar la base de datos (Global)
  app.post("/api/reset", async (_req, res) => {
    try {
      await storage.resetAllStats();
      res.json({ success: true, message: "Ranking reiniciado correctamente" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error al reiniciar" });
    }
  });

  return httpServer;
}
