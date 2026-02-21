import { Telegraf, Markup } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

const CATEGORIES: Record<string, string[]> = {
  'Animales': ['León', 'Elefante', 'Tigre', 'Jirafa', 'Delfín', 'Pingüino', 'Canguro', 'Oso', 'Lobo', 'Águila', 'Tiburón', 'Cocodrilo', 'Serpiente', 'Caballo', 'Cerdo', 'Vaca', 'Gato', 'Perro', 'Conejo', 'Rata'],
  'Tecnología': ['Smartphone', 'Computadora', 'Internet', 'Software', 'Hardware', 'Teclado', 'Ratón', 'Monitor', 'Cámara', 'Dron', 'Robot', 'Microchip', 'Satélite', 'Criptomoneda', 'Videojuego', 'Realidad Virtual', 'Inteligencia Artificial', 'Servidor', 'Nube', 'Batería'],
  'Comida': ['Pizza', 'Hamburguesa', 'Sushi', 'Tacos', 'Pasta', 'Ensalada', 'Sopa', 'Helado', 'Pastel', 'Galleta', 'Chocolate', 'Pan', 'Queso', 'Huevo', 'Pollo', 'Carne', 'Pescado', 'Manzana', 'Plátano', 'Naranja'],
  'Profesiones': ['Médico', 'Ingeniero', 'Abogado', 'Profesor', 'Policía', 'Bombero', 'Cocinero', 'Mecánico', 'Carpintero', 'Electricista', 'Plomero', 'Pintor', 'Músico', 'Actor', 'Escritor', 'Periodista', 'Fotógrafo', 'Piloto', 'Astronauta', 'Deportista'],
  'Cine y TV': ['Película', 'Serie', 'Actor', 'Director', 'Cámara', 'Guion', 'Escenario', 'Efectos Especiales', 'Comedia', 'Drama', 'Acción', 'Terror', 'Ciencia Ficción', 'Documental', 'Animación', 'Taquilla', 'Cine', 'Televisión', 'Proyector', 'Palomitas']
};

const deleteAfter = (ctx: any, msgId: number, delay = 3000) => {
  setTimeout(() => {
    ctx.deleteMessage(msgId).catch(() => {});
  }, delay);
};

const renderLobby = (game: any) => {
  let playerNames = Array.from(game.playerData.values()).map((p: any) => `- ${p.name}`).join('\n');
  const text = `🎮 ¡Partida creada por ${game.hostName}!\n\n` +
               `⚙️ CONFIGURACIÓN:\n` +
               `📚 Categoría: ${game.settings.category}\n` +
               `😈 Impostores: ${game.settings.impostors}\n\n` +
               `👥 JUGADORES (${game.players.size}):\n${playerNames}\n\n` +
               `Toquen el botón de abajo para entrar:`;
               
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✋ Unirse a la partida', 'join_game')],
    [
      Markup.button.callback('📚 Cambiar Categoría', 'menu_cat'),
      Markup.button.callback(`😈 Impostores: ${game.settings.impostors}`, 'toggle_imp')
    ],
    [
      Markup.button.callback('🚀 Arrancar', 'start_game'),
      Markup.button.callback('🛑 Cancelar', 'cancel_game')
    ]
  ]);
  return { text, keyboard };
};

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const bot = new Telegraf(token);

  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await ctx.reply("¡Hola! Soy El Impostor Pro 🤖.\nAñádeme a un grupo para empezar.\n\nEscribe /iniciar en el grupo para abrir una sala.");
    }
  });

  bot.command('iniciar', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Este comando solo funciona en grupos.");
    const chatId = ctx.chat.id;
    ctx.deleteMessage().catch(() => {});

    if (activeGames.has(chatId)) {
      const msg = await ctx.reply("Ya hay una partida configurándose.");
      deleteAfter(ctx, msg.message_id, 4000);
      return;
    }

    activeGames.set(chatId, {
      hostId: ctx.from.id,
      hostName: ctx.from.first_name,
      state: 'waiting',
      players: new Set<number>([ctx.from.id]),
      playerData: new Map<number, { id: number, name: string }>(),
      settings: { category: 'Aleatorio', impostors: 1 }
    });
    activeGames.get(chatId).playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    const { text, keyboard } = renderLobby(activeGames.get(chatId));
    await ctx.reply(text, keyboard);
  });

  // COMANDO RANKING: Muestra el top 10 en el chat
  bot.command('ranking', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    ctx.deleteMessage().catch(() => {});
    
    const topPlayers = await storage.getTopPlayersByChat(ctx.chat.id.toString(), 10);
    if (topPlayers.length === 0) {
      const msg = await ctx.reply("Nadie ha jugado aún en este grupo.");
      deleteAfter(ctx, msg.message_id, 4000);
      return;
    }

    let rankingMsg = "🏆 *RANKING DEL GRUPO* 🏆\n\n";
    topPlayers.forEach((p, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤";
      rankingMsg += `${medal} *${p.firstName}*: ${p.points} pts\n`;
    });
    
    const msg = await ctx.reply(rankingMsg, { parse_mode: 'Markdown' });
    deleteAfter(ctx, msg.message_id, 15000);
  });

  // ACCIÓN: Ver ranking desde botón
  bot.action('view_group_ranking', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const topPlayers = await storage.getTopPlayersByChat(chatId, 10);
    if (topPlayers.length === 0) return ctx.answerCbQuery("Sin datos aún.");

    let msg = "🏆 *TOP 10 DEL GRUPO*\n\n";
    topPlayers.forEach((p, i) => {
      msg += `${i + 1}. *${p.firstName}* - ${p.points} pts\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown' });
    ctx.answerCbQuery();
  });

  bot.action('my_stats', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    const player = await storage.getPlayerByTelegramId(ctx.from.id.toString(), chatId);
    if (player) {
      await ctx.answerCbQuery(`👤 ${player.firstName}\n🏆 Puntos: ${player.points}\n🎮 Partidas: ${player.gamesPlayed}`, { show_alert: true });
    } else {
      await ctx.answerCbQuery("No tienes puntos en este grupo.", { show_alert: true });
    }
  });

  bot.action('play_again', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId || activeGames.has(chatId)) return ctx.answerCbQuery("Ya hay una partida activa.");

    activeGames.set(chatId, {
      hostId: ctx.from.id,
      hostName: ctx.from.first_name,
      state: 'waiting',
      players: new Set<number>([ctx.from.id]),
      playerData: new Map<number, { id: number, name: string }>(),
      settings: { category: 'Aleatorio', impostors: 1 }
    });
    activeGames.get(chatId).playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    const { text, keyboard } = renderLobby(activeGames.get(chatId));
    await ctx.editMessageText(text, keyboard);
    ctx.answerCbQuery();
  });

  bot.action('join_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.state !== 'waiting') return ctx.answerCbQuery("No disponible.");
    if (game.players.has(ctx.from.id)) return ctx.answerCbQuery("Ya estás dentro.");

    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
    ctx.answerCbQuery();
  });

  bot.action('toggle_imp', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    game.settings.impostors = game.settings.impostors >= 3 ? 1 : game.settings.impostors + 1;
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
  });

  bot.action('menu_cat', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🦁 Animales', 'cat_Animales'), Markup.button.callback('💻 Tecnología', 'cat_Tecnología')],
      [Markup.button.callback('🍕 Comida', 'cat_Comida'), Markup.button.callback('👮 Profesiones', 'cat_Profesiones')],
      [Markup.button.callback('🎬 Cine y TV', 'cat_Cine y TV'), Markup.button.callback('🎲 Aleatorio', 'cat_Aleatorio')],
      [Markup.button.callback('🔙 Volver', 'back_lobby')]
    ]);
    await ctx.editMessageText("📚 Categoría:", keyboard);
  });

  bot.action(/cat_(.+)/, async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (game) {
      game.settings.category = ctx.match[1];
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, keyboard);
    }
  });

  bot.action('back_lobby', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (game) {
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, keyboard);
    }
  });

  bot.action('cancel_game', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    activeGames.delete(ctx.chat!.id);
    await ctx.editMessageText("🛑 Partida cancelada.");
    deleteAfter(ctx, ctx.callbackQuery.message!.message_id, 3000);
  });

  bot.action('start_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.hostId !== ctx.from.id) return;
    if (game.players.size < 2) return ctx.answerCbQuery("Mínimo 2 jugadores.");

    game.state = 'playing';
    await ctx.editMessageText("🎲 Repartiendo roles...");

    const playersArray = Array.from(game.players);
    playersArray.sort(() => Math.random() - 0.5);
    game.impostors = new Set(playersArray.slice(0, game.settings.impostors));
    
    let secretWord = "";
    const cat = game.settings.category === 'Aleatorio' ? Object.keys(CATEGORIES)[Math.floor(Math.random()*5)] : game.settings.category;
    const words = CATEGORIES[cat];
    secretWord = words[Math.floor(Math.random() * words.length)];

    for (const p of game.players) {
      const isImp = game.impostors.has(p as number);
      const text = isImp ? `Eres IMPOSTOR 😈\nCategoría: ${cat}` : `Eres CIUDADANO 👨‍💼\nCategoría: ${cat}\nPalabra: ${secretWord}`;
      bot.telegram.sendMessage(p as number, text).catch(() => {});
    }

    const starter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]).name;
    await ctx.editMessageText(`🚨 ¡A JUGAR! 🚨\n\nCategoría: ${cat}\n\nEmpieza: ${starter}`, Markup.inlineKeyboard([
      [Markup.button.callback('🏆 Ganaron Ciudadanos', 'win_cits')],
      [Markup.button.callback('🏆 Ganaron Impostores', 'win_imp')]
    ]));
  });

  bot.action(/win_(cits|imp)/, async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.hostId !== ctx.from.id) return;

    const winner = ctx.match[1] === 'cits' ? 'ciudadanos' : 'impostores';
    let result = `🏆 ¡GANAN LOS ${winner.toUpperCase()}!\n\n📊 PUNTOS:\n`;

    for (const p of game.players) {
      const isImp = game.impostors.has(p);
      let pts = (winner === 'impostores' && isImp) ? 3 : (winner === 'ciudadanos' && !isImp) ? 1 : 0;
      const player = await storage.updatePlayerPoints(p.toString(), chatId!.toString(), pts);
      result += `${pts > 0 ? '✅' : '❌'} ${game.playerData.get(p).name}: +${pts} (Total: ${player.points})\n`;
    }

    activeGames.delete(chatId!);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Jugar de nuevo', 'play_again')],
      [
        Markup.button.callback('👤 Mis Puntos', 'my_stats'),
        Markup.button.callback('📊 Ranking Grupo', 'view_group_ranking')
      ]
    ]);

    await ctx.editMessageText(result, keyboard);
  });

  bot.launch().then(() => console.log("🚀 Bot listo!"));
}
