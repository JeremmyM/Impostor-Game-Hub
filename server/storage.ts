import { db } from "./db";
import { players, type Player, type InsertPlayer } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getPlayerByTelegramId(telegramId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerPoints(telegramId: string, pointsDelta: number): Promise<Player>;
  getTopPlayers(limit: number): Promise<Player[]>;
  getTotalStats(): Promise<{ totalPlayers: number, totalGames: number }>;
}

export class DatabaseStorage implements IStorage {
  async getPlayerByTelegramId(telegramId: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.telegramId, telegramId));
    return player;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayerPoints(telegramId: string, pointsDelta: number): Promise<Player> {
    const player = await this.getPlayerByTelegramId(telegramId);
    if (!player) throw new Error("Player not found");
    const [updated] = await db.update(players)
      .set({ 
        points: player.points + pointsDelta,
        gamesPlayed: player.gamesPlayed + 1
      })
      .where(eq(players.telegramId, telegramId))
      .returning();
    return updated;
  }

  async getTopPlayers(limit: number): Promise<Player[]> {
    return await db.select().from(players).orderBy(desc(players.points)).limit(limit);
  }

  async getTotalStats(): Promise<{ totalPlayers: number, totalGames: number }> {
    const allPlayers = await db.select().from(players);
    const totalPlayers = allPlayers.length;
    const totalGames = allPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0);
    return { totalPlayers, totalGames };
  }
}

export const storage = new DatabaseStorage();