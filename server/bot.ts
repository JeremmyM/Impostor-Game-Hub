import { Telegraf, Markup } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

// 📚 DICCIONARIO MASIVO DE PALABRAS
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

// Función para dibujar el menú principal de la sala
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
      await ctx.reply("¡Hola! Soy El Impostor Pro 🤖.\nAñádeme a un grupo para empezar a jugar.\n\nEscribe /iniciar en el grupo para abrir una sala.");
    }
  });

  bot.command('iniciar', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Este comando solo funciona en grupos.");
    const chatId = ctx.chat.id;
    
    if (activeGames.has(chatId)) {
      const msg = await ctx.reply("Ya hay una partida configurándose. Usa /cancelar si se quedó atascada.");
      deleteAfter(ctx, msg.message_id);
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

    ctx.deleteMessage().catch(() => {});
    const { text, keyboard } = renderLobby(activeGames.get(chatId));
    await ctx.reply(text, keyboard);
  });

  // COMANDO MANUAL PARA CANCELAR
  bot.command('cancelar', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const chatId = ctx.chat.id;
    
    if (!activeGames.has(chatId)) {
      const msg = await ctx.reply("No hay ninguna partida activa para cancelar.");
      deleteAfter(ctx, msg.message_id);
      return;
    }

    const game = activeGames.get(chatId);
    if (game.hostId !== ctx.from.id) {
      const msg = await ctx.reply("❌ Solo el anfitrión que creó la partida puede cancelarla.");
      deleteAfter(ctx, msg.message_id);
      return;
    }

    activeGames.delete(chatId);
    ctx.deleteMessage().catch(() => {});
    await ctx.reply("🛑 La partida ha sido cancelada por el anfitrión. El grupo está libre para un nuevo /iniciar.");
  });

  // BOTÓN INTEGRADO PARA CANCELAR
  bot.action('cancel_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game) return ctx.answerCbQuery("No hay partida activa.", { show_alert: true });
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede cancelar.", { show_alert: true });

    activeGames.delete(chatId);
    await ctx.editMessageText("🛑 La partida ha sido cancelada por el anfitrión. El grupo está libre para un nuevo /iniciar.");
  });

  bot.action('join_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') return ctx.answerCbQuery("La partida no está disponible.", { show_alert: true });
    if (game.players.has(ctx.from.id)) return ctx.answerCbQuery("¡Ya estás dentro!");

    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });

    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
    await ctx.answerCbQuery("¡Te has unido a la partida!");
  });

  // BOTÓN: CAMBIAR CANTIDAD DE IMPOSTORES
  bot.action('toggle_imp', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game) return;
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede configurar esto.", { show_alert: true });

    game.settings.impostors = game.settings.impostors >= 3 ? 1 : game.settings.impostors + 1;
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
  });

  // BOTÓN: MENÚ DE CATEGORÍAS
  bot.action('menu_cat', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game) return;
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede configurar esto.", { show_alert: true });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🦁 Animales', 'cat_Animales'), Markup.button.callback('💻 Tecnología', 'cat_Tecnología')],
      [Markup.button.callback('🍕 Comida', 'cat_Comida'), Markup.button.callback('👮 Profesiones', 'cat_Profesiones')],
      [Markup.button.callback('🎬 Cine y TV', 'cat_Cine y TV'), Markup.button.callback('🎲 Aleatorio', 'cat_Aleatorio')],
      [Markup.button.callback('🔙 Volver', 'back_lobby')]
    ]);
    await ctx.editMessageText("📚 Selecciona la categoría para esta partida:", keyboard);
  });

  // SELECCIONAR UNA CATEGORÍA ESPECÍFICA (Usa Regex para detectar cualquiera)
  bot.action(/cat_(.+)/, async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);
    if (!game) return;

    game.settings.category = ctx.match[1];
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
  });

  // VOLVER AL LOBBY
  bot.action('back_lobby', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);
    if (!game) return;

    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, keyboard);
  });

  bot.action('start_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'waiting') return;
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede arrancar el juego.", { show_alert: true });
    
    // ⚠️ LÍMITE DE PRUEBA: 2 JUGADORES (Cámbialo a 3 o más cuando juegues con amigos)
    if (game.players.size < 2) return ctx.answerCbQuery("⚠️ Faltan jugadores. Mínimo 2.", { show_alert: true });
    if (game.settings.impostors >= game.players.size) return ctx.answerCbQuery("⚠️ Hay demasiados impostores para tan pocos jugadores.", { show_alert: true });

    game.state = 'playing';
    
    await ctx.editMessageText("🎲 Mezclando los roles en secreto...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.editMessageText(`🤫 Buscando una palabra de la categoría: ${game.settings.category}...`);
    
    const playersArray = Array.from(game.players);
    playersArray.sort(() => Math.random() - 0.5);
    
    // Asignar impostores según la configuración
    game.impostors = new Set(playersArray.slice(0, game.settings.impostors));
    game.citizens = new Set(playersArray.slice(game.settings.impostors));
    
    // Elegir palabra secreta
    let secretWord = "";
    if (game.settings.category === 'Aleatorio') {
      const allWords = Object.values(CATEGORIES).flat();
      secretWord = allWords[Math.floor(Math.random() * allWords.length)];
    } else {
      const words = CATEGORIES[game.settings.category];
      secretWord = words[Math.floor(Math.random() * words.length)];
    }

    let failures = 0;
    for (const p of game.players) {
      const isImpostor = game.impostors.has(p as number);
      const text = isImpostor 
        ? `Eres el IMPOSTOR 😈.\nLa categoría es: *${game.settings.category}*.\nIntenta adivinar la palabra secreta o pasa desapercibido.` 
        : `Eres un CIUDADANO 👨‍💼.\nLa categoría es: *${game.settings.category}*\nLa palabra secreta es: *${secretWord}*`;
      
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
    await ctx.editMessageText("🕵️‍♂️ Despertando a los jugadores...");

    await new Promise(resolve => setTimeout(resolve, 2000));
    const randomStarter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]);
    
    await ctx.editMessageText(
      `🚨 ¡LA PARTIDA HA COMENZADO! 🚨\n\n📚 Categoría: ${game.settings.category}\n\nEmpieza el debate: ¡${randomStarter.name}, da la primera pista!\n\nCuando decidan al ganador, el anfitrión debe tocar una opción:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🏆 Ganaron Ciudadanos', 'win_cits')],
        [Markup.button.callback('🏆 Ganaron Impostores', 'win_imp')]
      ])
    );
  });

  // BOTONES DE FINALIZAR REPARADOS CON REGEX
  bot.action(/win_(cits|imp)/, async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const game = activeGames.get(chatId);

    if (!game || game.state !== 'playing') return;
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede finalizar la partida.", { show_alert: true });

    // match[1] captura si fue 'cits' o 'imp'
    const winner = ctx.match[1] === 'cits' ? 'ciudadanos' : 'impostores';
    
    for (const p of game.players) {
      const pIdStr = p.toString();
      const isImpostor = game.impostors.has(p);
      let pointsDelta = 0;
      
      if (winner === 'impostores' && isImpostor) pointsDelta = 3;
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
    await ctx.editMessageText(`🏆 ¡Partida terminada!\n\nLos ${winner.toUpperCase()} han ganado.\n¡Puntos guardados en el ranking web!`);
  });

  bot.launch().then(() => { console.log("🚀 Telegram Bot started!"); });
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}
