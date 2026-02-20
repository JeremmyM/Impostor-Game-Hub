import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  // Quitamos .unique() porque un usuario puede estar en múltiples grupos
  telegramId: text("telegram_id").notNull(), 
  // Añadimos el ID del grupo para separar los rankings
  chatId: text("chat_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  points: integer("points").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
