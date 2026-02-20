import { Telegraf } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

const WORDS = [
  "Cibernética", "Neón", "Hacker", "Algoritmo", "Servidor", 
  "Inteligencia Artificial", "Criptomoneda", "Realidad Virtual", 
  "Metaverso", "Firewall", "Nube", "Protocolo"
];

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("⚠️ TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
    return null;
  }

  const bot = new Telegraf(token);

  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await ctx.reply("¡Hola! Soy El Impostor Pro 🤖.\nAñádeme a un grupo para empezar a jugar.\n\nReglas:\n1. Un jugador inicia la partida en el grupo.\n2. Los demás se unen.\n3. Recibirás tu rol aquí por mensaje privado.");
    }
  });

  bot.command('iniciar', async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply("Este comando solo funciona en grupos. ¡Añádeme a uno!");
    }

    const chatId = ctx.chat.id;
    if (activeGames.has(chatId)) {
      return ctx.reply("Ya hay una partida configurándose en este grupo.");
    }

    activeGames.set(chatId, {
      hostId: ctx.from.id,
      state: 'waiting',
      players: new Set<number>([ctx.from.id]),
      playerData: new Map<number, { id: number, name: string }>(),
    });
    activeGames.get(chatId).playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    await ctx.reply(`¡Partida iniciada por ${ctx.from.first_name}!\n\nJugadores: 1\n\nUsa /unirse para entrar al juego.\nEl anfitrión debe usar /arrancar cuando estén todos listos.`);
  });

  bot.command('unirse', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const chatId = ctx.chat.id;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') {
      return ctx.reply("No hay ninguna partida esperando jugadores. Usa /iniciar para crear una.");
    }

    if (game.players.has(ctx.from.id)) {
      return ctx.reply("Ya estás en la partida.");
    }

    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    await ctx.reply(`¡${ctx.from.first_name} se ha unido!\nJugadores: ${game.players.size}`);
  });

  bot.command('arrancar', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const chatId = ctx.chat.id;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') return;
    if (game.hostId !== ctx.from.id) {
      return ctx.reply("Solo el anfitrión puede arrancar la partida.");
    }

    if (game.players.size < 3) {
      return ctx.reply("Se necesitan al menos 3 jugadores para empezar.");
    }

    game.state = 'playing';
    
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
      await ctx.reply(`⚠️ ATENCIÓN: ${failures} jugador(es) no han iniciado el bot por mensaje privado. ¡Aseguraos de iniciar un chat conmigo primero para recibir el rol! La partida se cancelará.`);
      activeGames.delete(chatId);
      return;
    }

    const randomStarter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]);
    
    await ctx.reply(`¡Roles enviados por mensaje privado!\n\nEmpieza el debate: ¡${randomStarter.name}, da la primera pista!\n\nCuando terminéis de debatir y votar, el anfitrión debe usar /fin [ciudadanos|impostor] para dar los puntos.`);
  });

  bot.command('fin', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const chatId = ctx.chat.id;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'playing') return;
    if (game.hostId !== ctx.from.id) {
      return ctx.reply("Solo el anfitrión puede finalizar la partida.");
    }

    const text = (ctx.message as any).text?.split(' ');
    if (!text || text.length < 2 || !['ciudadanos', 'impostor'].includes(text[1].toLowerCase())) {
      return ctx.reply("Uso: /fin ciudadanos o /fin impostor");
    }

    const winner = text[1].toLowerCase();
    
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
        console.error("Error updating points for player", p, e);
      }
    }

    activeGames.delete(chatId);
    await ctx.reply(`¡Partida terminada! Los ${winner} han ganado.\n\nPuntuaciones actualizadas en el marcador permanente.`);
  });

  bot.launch().then(() => {
    console.log("🚀 Telegram Bot started!");
  }).catch(e => {
    console.error("❌ Failed to start bot:", e);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}