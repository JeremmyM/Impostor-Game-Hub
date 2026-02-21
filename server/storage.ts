import { players, type Player, type InsertPlayer } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getPlayerByTelegramId(telegramId: string, chatId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  // Añadimos firstName opcional para poder crear al jugador si no existe
  updatePlayerPoints(telegramId: string, chatId: string, points: number, firstName?: string): Promise<Player>;
  getTopPlayers(limit: number): Promise<Player[]>;
  getTopPlayersByChat(chatId: string, limit: number): Promise<Player[]>;
  resetChatStats(chatId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

  // MÉTODO OPTIMIZADO: Crea al jugador si no existe en lugar de dar error
  async updatePlayerPoints(telegramId: string, chatId: string, points: number, firstName: string = "Jugador"): Promise<Player> {
    let player = await this.getPlayerByTelegramId(telegramId, chatId);

    if (!player) {
      // Si el jugador no existe en este chat, lo creamos primero
      player = await this.createPlayer({
        telegramId,
        chatId,
        firstName,
        points: 0,
        gamesPlayed: 0
      });
    }

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

  async getTopPlayers(limit: number): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .orderBy(desc(players.points))
      .limit(limit);
  }

  async getTopPlayersByChat(chatId: string, limit: number): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.chatId, chatId))
      .orderBy(desc(players.points))
      .limit(limit);
  }

  async resetChatStats(chatId: string): Promise<void> {
    await db
      .update(players)
      .set({
        points: 0,
        gamesPlayed: 0,
      })
      .where(eq(players.chatId, chatId));
  }
}

export const storage = new DatabaseStorage();
