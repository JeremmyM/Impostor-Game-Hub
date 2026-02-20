import { Telegraf, Markup } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

const WORDS = [
  "Cibernética", "Neón", "Hacker", "Algoritmo", "Servidor", 
  "Inteligencia Artificial", "Criptomoneda", "Realidad Virtual", 
  "Metaverso", "Firewall", "Nube", "Protocolo"
];

const deleteAfter = (ctx: any, msgId: number, delay = 3000) => {
  setTimeout(() => {
    ctx.deleteMessage(msgId).catch(() => {});
  }, delay);
};

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("⚠️ TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
    return null;
  }

  const bot = new Telegraf(token);

  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await ctx.reply("¡Hola! Soy El Impostor Pro 🤖.\nAñádeme a un grupo para empezar a jugar.\n\nReglas:\n1. Escribe /iniciar en el grupo.\n2. Los demás tocan el botón para unirse.\n3. Recibirás tu rol aquí por mensaje privado.");
    }
  });

  bot.command('iniciar', async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply("Este comando solo funciona en grupos. ¡Añádeme a uno!");
    }

    const chatId = ctx.chat.id;
    if (activeGames.has(chatId)) {
      const msg = await ctx.reply("Ya hay una partida configurándose en este grupo.");
      deleteAfter(ctx, msg.message_id);
      return;
    }

    activeGames.set(chatId, {
      hostId: ctx.from.id,
      state: 'waiting',
      players: new Set<number>([ctx.from.id]),
      playerData: new Map<number, { id: number, name: string }>(),
    });
    activeGames.get(chatId).playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    ctx.deleteMessage().catch(() => {});
    
    // ENVIAMOS EL MENSAJE CON BOTONES ELEGANTES
    await ctx.reply(
      `🎮 ¡Partida creada por ${ctx.from.first_name}!\n\n👥 Jugadores listos: 1\n- ${ctx.from.first_name}\n\nToquen el botón de abajo para entrar:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✋ Unirse a la partida', 'join_game')],
        [Markup.button.callback('🚀 Arrancar (Solo Anfitrión)', 'start_game')]
      ])
    );
  });

  // CUANDO ALGUIEN TOCA EL BOTÓN "UNIRSE"
  bot.action('join_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') {
      return ctx.answerCbQuery("La partida ya no está disponible.", { show_alert: true });
    }

    if (game.players.has(ctx.from.id)) {
      return ctx.answerCbQuery("¡Ya estás dentro de la partida!", { show_alert: false });
    }

    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    let playerNames = "";
    game.playerData.forEach((p: any) => playerNames += `- ${p.name}\n`);

    // Actualizamos el mismo mensaje (cero spam)
    await ctx.editMessageText(
      `🎮 ¡Partida creada por alguien!\n\n👥 Jugadores listos: ${game.players.size}\n${playerNames}\nToquen el botón de abajo para entrar:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✋ Unirse a la partida', 'join_game')],
        [Markup.button.callback('🚀 Arrancar (Solo Anfitrión)', 'start_game')]
      ])
    );
    
    await ctx.answerCbQuery("¡Te has unido a la partida!");
  });

  // CUANDO EL ANFITRIÓN TOCA EL BOTÓN "ARRANCAR"
  bot.action('start_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') return;
    
    if (game.hostId !== ctx.from.id) {
      return ctx.answerCbQuery("❌ Solo el anfitrión puede arrancar el juego.", { show_alert: true });
    }

    // LÍMITE DE PRUEBA: 2 JUGADORES
    if (game.players.size < 2) {
      return ctx.answerCbQuery("⚠️ Faltan jugadores. Mínimo 2.", { show_alert: true });
    }

    game.state = 'playing';
    
    // SUSPENSO Y LIMPIEZA
    await ctx.editMessageText("🎲 Mezclando los roles en secreto...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.editMessageText("🤫 Repartiendo las palabras a los Ciudadanos...");
    
    const playersArray = Array.from(game.players);
    playersArray.sort(() => Math.random() - 0.5);
    
    const numImpostors = Math.max(1, Math.floor(playersArray.length / 4));
    game.impostors = new Set(playersArray.slice(0, numImpostors));
    game.citizens = new Set(playersArray.slice(numImpostors));
    
    const secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];

    let failures = 0;
    for (const p of game.players) {
      const isImpostor = game.impostors.has(p as number);
      const text = isImpostor 
        ? "Eres el IMPOSTOR 😈. Intenta adivinar la palabra o pasa desapercibido." 
        : `Eres un CIUDADANO 👨‍💼. La palabra secreta es: *${secretWord}*`;
      
      try {
        await bot.telegram.sendMessage(p as number, text, { parse_mode: 'Markdown' });
      } catch (err) {
        failures++;
      }
    }

    if (failures > 0) {
      await ctx.editMessageText(`⚠️ ATENCIÓN: ${failures} jugador(es) no le ha hablado al bot por privado. ¡Partida cancelada!`);
      activeGames.delete(chatId);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.editMessageText("🕵️‍♂️ Despertando al Impostor...");

    await new Promise(resolve => setTimeout(resolve, 2000));
    const randomStarter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]);
    
    // BOTONES PARA TERMINAR LA PARTIDA
    await ctx.editMessageText(
      `🚨 ¡LA PARTIDA HA COMENZADO! 🚨\n\nEmpieza el debate: ¡${randomStarter.name}, da la primera pista!\n\nCuando decidan al ganador, el anfitrión debe tocar una opción:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🏆 Ganaron Ciudadanos', 'win_cits')],
        [Markup.button.callback('🏆 Ganó el Impostor', 'win_imp')]
      ])
    );
  });

  // BOTONES DE FINALIZAR
  bot.action(['win_cits', 'win_imp'], async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'playing') return;
    if (game.hostId !== ctx.from.id) {
      return ctx.answerCbQuery("❌ Solo el anfitrión puede finalizar la partida.", { show_alert: true });
    }

    const winner = ctx.match[0] === 'win_cits' ? 'ciudadanos' : 'impostor';
    
    for (const p of game.players) {
      const pIdStr = p.toString();
      const isImpostor = game.impostors.has(p);
      let pointsDelta = 0;
      
      if (winner === 'impostor' && isImpostor) pointsDelta = 3;
      else if (winner === 'ciudadanos' && !isImpostor) pointsDelta = 1;

      try {
        let player = await storage.getPlayerByTelegramId(pIdStr);
        if (!player) {
          player = await storage.createPlayer({
            telegramId: pIdStr,
            username: game.playerData.get(p).name,
            firstName: game.playerData.get(p).name,
            points: 0,
            gamesPlayed: 0
          });
        }
        await storage.updatePlayerPoints(pIdStr, pointsDelta);
      } catch (e) {
        console.error(e);
      }
    }

    activeGames.delete(chatId);
    await ctx.editMessageText(`🏆 ¡Partida terminada!\n\nLos ${winner.toUpperCase()} han ganado la partida.\n¡Puntos guardados en el ranking web!`);
  });

  bot.launch().then(() => { console.log("🚀 Telegram Bot started!"); });
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}
