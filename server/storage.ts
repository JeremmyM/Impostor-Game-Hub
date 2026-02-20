import { players, type Player, type InsertPlayer } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getPlayerByTelegramId(telegramId: string, chatId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerPoints(telegramId: string, chatId: string, points: number): Promise<Player>;
  getTopPlayers(limit: number): Promise<Player[]>;
  getTopPlayersByChat(chatId: string, limit: number): Promise<Player[]>; // Nueva función
}

export class DatabaseStorage implements IStorage {
  // Ahora buscamos por ID de usuario Y por ID de grupo
  async getPlayerByTelegramId(telegramId: string, chatId: string): Promise<Player | undefined> {
    const [player] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.telegramId, telegramId),
          eq(players.chatId, chatId)
        )
      );
    return player;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values(insertPlayer)
      .returning();
    return player;
  }

  async updatePlayerPoints(telegramId: string, chatId: string, points: number): Promise<Player> {
    const player = await this.getPlayerByTelegramId(telegramId, chatId);
    if (!player) throw new Error("Player not found");

    const [updated] = await db
      .update(players)
      .set({
        points: player.points + points,
        gamesPlayed: (player.gamesPlayed || 0) + 1,
      })
      .where(
        and(
          eq(players.telegramId, telegramId),
          eq(players.chatId, chatId)
        )
      )
      .returning();
    return updated;
  }

  // Ranking de toda la App (Global)
  async getTopPlayers(limit: number): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .orderBy(desc(players.points))
      .limit(limit);
  }

  // Ranking específico de UN grupo
  async getTopPlayersByChat(chatId: string, limit: number): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.chatId, chatId))
      .orderBy(desc(players.points))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
