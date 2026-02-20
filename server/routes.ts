import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
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

  // Seed db just in case it's empty
  setTimeout(async () => {
    try {
      const all = await storage.getTopPlayers(1);
      if (all.length === 0) {
        await storage.createPlayer({ telegramId: "12345", firstName: "CyberPlayer", username: "cyber_p", points: 15, gamesPlayed: 5 });
        await storage.createPlayer({ telegramId: "67890", firstName: "NeonHacker", username: "neon_h", points: 8, gamesPlayed: 4 });
        await storage.createPlayer({ telegramId: "11111", firstName: "ImpostorBot", username: "impostor_bot", points: 20, gamesPlayed: 10 });
      }
    } catch(e) {}
  }, 3000);

  return httpServer;
}