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

const renderLobby = (game: any) => {
  let playerNames = Array.from(game.playerData.values()).map((p: any) => `- ${p.name}`).join('\n');
  const text = `🎮 *¡Partida creada por ${game.hostName}!* \n\n` +
               `⚙️ *CONFIGURACIÓN:*\n` +
               `📚 Categoría: ${game.settings.category}\n` +
               `😈 Impostores: ${game.settings.impostors}\n\n` +
               `👥 JUGADORES (${game.players.size}):\n${playerNames}\n\n` +
               `Toquen el botón de abajo para entrar:`;
               
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✋ Unirse a la partida', 'join_game')],
    [
      Markup.button.callback('📚 Categoría', 'menu_cat'),
      Markup.button.callback(`😈 Impostores: ${game.settings.impostors}`, 'toggle_imp')
    ],
    [
      Markup.button.callback('👤 Mis Puntos', 'my_stats'),
      Markup.button.callback('📊 Ranking', 'view_group_ranking')
    ],
    [
      Markup.button.callback('🚀 Arrancar', 'start_game'),
      Markup.button.callback('🛑 Cancelar', 'cancel_game')
    ],
    [Markup.button.callback('♻️ Reiniciar Puntos del Grupo', 'reset_group_points')]
  ]);
  return { text, keyboard };
};

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const bot = new Telegraf(token);

  // --- MANEJO DE ERRORES GLOBAL ---
  bot.catch((err: any, ctx) => {
    console.error(`Error en actualización ${ctx.updateType}:`, err);
  });

  // --- COMANDOS ---

  // NUEVO: Comando /start para privado
  bot.start(async (ctx) => {
    const name = ctx.from.first_name;
    const welcome = `👋 ¡Hola ${name}!\n\nYa me has activado por privado. Ahora puedo enviarte tus palabras secretas cuando juegues en un grupo.\n\n📍 **¿Cómo empezar?**\nUsa /iniciar en un grupo donde yo esté presente.`;
    await ctx.replyWithMarkdown(welcome);
  });

  bot.command('iniciar', async (ctx) => {
    // Verificamos si es grupo
    if (ctx.chat.type === 'private') {
      return ctx.reply("❌ Este juego solo funciona en grupos. ¡Añádeme a uno!");
    }

    const chatId = ctx.chat.id;
    
    // Si ya hay una partida, avisamos
    if (activeGames.has(chatId)) {
      return ctx.reply("⚠️ Ya hay una partida en curso o una sala abierta en este grupo.");
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
    await ctx.replyWithMarkdown(text, keyboard);
  });

  // --- RANKING Y ESTADÍSTICAS ---
  bot.action('view_group_ranking', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    const top = await storage.getTopPlayersByChat(chatId, 10);
    if (top.length === 0) return ctx.answerCbQuery("Aún no hay puntos en este grupo.", { show_alert: true });

    let msg = "🏆 TOP 10 RANKING 🏆\n\n";
    top.forEach((p, i) => { msg += `${i + 1}. ${p.firstName} - ${p.points} pts\n`; });

    await ctx.answerCbQuery(msg, { show_alert: true });
  });

  bot.action('my_stats', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    const player = await storage.getPlayerByTelegramId(ctx.from.id.toString(), chatId);
    const pts = player ? player.points : 0;
    await ctx.answerCbQuery(`👤 ${ctx.from.first_name}\n🏆 Tus puntos en este grupo: ${pts}`, { show_alert: true });
  });

  // --- GESTIÓN DE SALA ---
  bot.action('reset_group_points', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    
    // Si no hay partida activa, permitimos resetear si es admin o el que lanzó el comando (simplificado al host)
    if (!game) return ctx.answerCbQuery("❌ Debes abrir una sala con /iniciar para gestionar los puntos.");
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión que abrió la sala puede reiniciar.", { show_alert: true });

    try {
      await storage.resetChatStats(chatId!.toString());
      await ctx.answerCbQuery("✅ ¡Puntos del grupo reseteados!", { show_alert: true });
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    } catch (e) {
      await ctx.answerCbQuery("❌ Error al acceder a la base de datos.");
    }
  });

  bot.action('join_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.state !== 'waiting') return ctx.answerCbQuery("La partida ya no existe.");
    if (game.players.has(ctx.from.id)) return ctx.answerCbQuery("Ya estás en la lista.");
    
    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });
    
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    ctx.answerCbQuery("¡Te has unido!");
  });

  bot.action('toggle_imp', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el anfitrión.");
    
    game.settings.impostors = game.settings.impostors >= 3 ? 1 : game.settings.impostors + 1;
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    ctx.answerCbQuery(`Configurado: ${game.settings.impostors} impostores`);
  });

  // --- CATEGORÍAS ---
  bot.action('menu_cat', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el anfitrión.");
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🦁 Animales', 'cat_Animales'), Markup.button.callback('💻 Tecnología', 'cat_Tecnología')],
      [Markup.button.callback('🍕 Comida', 'cat_Comida'), Markup.button.callback('🎬 Cine', 'cat_Cine y TV')],
      [Markup.button.callback('🎲 Aleatorio', 'cat_Aleatorio')],
      [Markup.button.callback('🔙 Volver', 'back_lobby')]
    ]);
    await ctx.editMessageText("Selecciona categoría:", keyboard);
  });

  bot.action(/cat_(.+)/, async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (game && game.hostId === ctx.from.id) {
      game.settings.category = ctx.match[1];
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    }
  });

  bot.action('back_lobby', async (ctx) => {
    const game = ctx.chat?.id ? activeGames.get(ctx.chat.id) : null;
    if (game) {
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    }
  });

  // --- LÓGICA DE JUEGO ---
  bot.action('start_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.hostId !== ctx.from.id) return;
    
    // Verificación de jugadores: Mínimo 3 para que tenga sentido el impostor
    if (game.players.size < 3) {
      return ctx.answerCbQuery("Se necesitan al menos 3 jugadores.", { show_alert: true });
    }

    game.state = 'playing';
    const playersArray = Array.from(game.players);
    playersArray.sort(() => Math.random() - 0.5);
    game.impostors = new Set(playersArray.slice(0, game.settings.impostors));
    
    let finalCat = game.settings.category;
    if (finalCat === 'Aleatorio') {
      const cats = Object.keys(CATEGORIES);
      finalCat = cats[Math.floor(Math.random() * cats.length)];
    }

    const words = CATEGORIES[finalCat];
    const secretWord = words[Math.floor(Math.random() * words.length)];

    // Envío de roles
    for (const p of game.players) {
      const isImp = game.impostors.has(p as number);
      const roleText = isImp 
        ? `😈 *ERES EL IMPOSTOR*\n\nCategoría: ${finalCat}\n\nNo sabes la palabra. ¡Miente para que no te pillen!` 
        : `👨‍💼 *ERES CIUDADANO*\n\nCategoría: ${finalCat}\nPalabra: *${secretWord}*\n\n¡Busca al impostor!`;
      
      bot.telegram.sendMessage(p as number, roleText, { parse_mode: 'Markdown' }).catch(() => {
        // Si falla el envío, avisar en consola
        console.log(`No se pudo enviar mensaje privado a ${p}`);
      });
    }

    const starter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]).name;
    
    await ctx.editMessageText(`🚨 ¡A JUGAR! 🚨\n\n📚 Categoría: *${finalCat}*\n🗣 Empieza: *${starter}*\n\nEl anfitrión debe marcar quién ganó cuando termine la ronda:`, 
      Markup.inlineKeyboard([
        [Markup.button.callback('🏆 Ganaron Ciudadanos', 'win_cits')],
        [Markup.button.callback('🏆 Ganaron Impostores', 'win_imp')]
      ])
    );
  });

  // --- FINALIZACIÓN Y RECUENTO ---
  bot.action(['win_cits', 'win_imp'], async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    
    if (!game) {
      return ctx.answerCbQuery("⚠️ Error: Sesión perdida. Usen /iniciar.", { show_alert: true });
    }
    
    if (game.state !== 'playing') return ctx.answerCbQuery("La partida ya finalizó.");
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede finalizar.", { show_alert: true });

    await ctx.answerCbQuery("Guardando resultados...");

    const winner = ctx.callbackQuery.data === 'win_cits' ? 'ciudadanos' : 'impostores';
    let result = `🏆 *¡GANAN LOS ${winner.toUpperCase()}!* 🏆\n\n📊 *RECUENTO:*\n`;

    try {
      const playersList = Array.from(game.players);
      
      const updatePromises = playersList.map(async (p) => {
        const isImp = game.impostors.has(p as number);
        let pts = 0;
        if (winner === 'impostores' && isImp) pts = 3;
        else if (winner === 'ciudadanos' && !isImp) pts = 1;

        const name = game.playerData.get(p as number)?.name || "Jugador";
        
        try {
          const player = await storage.updatePlayerPoints(p.toString(), chatId!.toString(), pts, name);
          return `${pts > 0 ? '✅' : '❌'} ${name}: +${pts} (Total: ${player.points})\n`;
        } catch (dbErr) {
          return `⚠️ ${name}: +${pts} pts (Error al guardar)\n`;
        }
      });

      const lines = await Promise.all(updatePromises);
      result += lines.join('');

      activeGames.delete(chatId!);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Jugar de nuevo', 'play_again')],
        [
          Markup.button.callback('👤 Mis Puntos', 'my_stats'),
          Markup.button.callback('📊 Ranking Grupo', 'view_group_ranking')
        ]
      ]);

      await ctx.editMessageText(result, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
      await ctx.reply("❌ Error técnico al finalizar.");
      activeGames.delete(chatId!);
    }
  });
  
  bot.action('play_again', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    if (activeGames.has(chatId)) return ctx.answerCbQuery("Ya hay una sala abierta.");
    
    await ctx.answerCbQuery();
    
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
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
  });

bot.action('cancel_game', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el anfitrión.");
    activeGames.delete(chatId!);
    await ctx.editMessageText("🛑 *Partida cancelada por el anfitrión.*", { parse_mode: 'Markdown' });
  });

  // Lanzar bot
  bot.launch().then(() => {
    console.log("-------------------------------");
    console.log("🚀 BOT DE IMPOSTOR ONLINE");
    console.log("-------------------------------");
  });

  // --- PEGA ESTO AQUÍ (SISTEMA ANTI-SUEÑO) ---
  const URL_DE_TU_APP = "https://tu-proyecto.onrender.com"; // ⚠️ REEMPLAZA CON TU URL REAL DE RENDER

  setInterval(() => {
    fetch(URL_DE_TU_APP)
      .then(() => console.log("⏰ Autoping: Bot despierto"))
      .catch(err => console.log("Aviso: Autoping realizado (ignorar si no hay servidor web)"));
  }, 10 * 60 * 1000); // Cada 10 minutos
  // -------------------------------------------

  // Parada graciosa
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
