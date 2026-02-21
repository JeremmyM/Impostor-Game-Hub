import { Telegraf, Markup } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

// --- CATEGORÍAS ACTUALIZADAS ---
const CATEGORIES: Record<string, string[]> = {
  'Personas 👤': [
    'Gheo', 'Nico', 'Ramirin', 'Presi', 
    'Messi', 'Cristiano Ronaldo', 'Elon Musk', 'Shakira', 'Bad Bunny', 'Ibai Llanos', 'Michael Jackson', 'MrBeast', 
    'AuronPlay', 'El Rubius', 'Luisito Comunica', 'Bizarrap', 'Daddy Yankee', 'Freddie Mercury', 'Eminem', 'Justin Bieber', 'Rosalía',
    'The Rock', 'Will Smith', 'Jackie Chan', 'Leonardo DiCaprio', 'Johnny Depp', 'Tom Cruise', 'Keanu Reeves', 'Taylor Swift', 'Zendaya',
    'Albert Einstein', 'Mark Zuckerberg', 'Steve Jobs', 'El Papa Francisco',
    'Maradona', 'Mike Tyson', 'Canelo Álvarez', 'Michael Jordan'
  ],
  'Películas 🎬': ['Titanic', 'Avatar', 'Star Wars', 'Harry Potter', 'El Rey León', 'Jurassic Park', 'Toy Story', 'Shrek', 'Batman', 'Spider-Man', 'Avengers', 'Coco', 'Joker', 'Matrix', 'Buscando a Nemo', 'Volver al Futuro', 'Terminator', 'Up', 'Mi Pobre Angelito', 'E.T.', 'Intensamente', 'El Señor de los Anillos', 'Forrest Gump', 'Monsters Inc'],  
  'Personajes 🦸‍♂️': ['Homero Simpson', 'Pikachu', 'Superman', 'Mickey Mouse', 'Darth Vader', 'Bob Esponja', 'Goku', 'Mario Bros', 'Barbie', 'Iron Man'],
  'Teorías 🧠': ['Relatividad', 'Evolución', 'Big Bang', 'Teoría de Cuerdas', 'Efecto Mandela', 'Efecto Mariposa', 'Gato de Schrödinger', 'Multiverso', 'Tierra Plana', 'Panspermia'],  
  'Animales 🦁': ['León', 'Elefante', 'Tigre', 'Jirafa', 'Delfín', 'Pingüino', 'Oso', 'Lobo', 'Tiburón', 'Cocodrilo', 'Perezoso', 'Avestruz', 'Canguro', 'Camaleón', 'Ornitorrinco', 'Zorrillo', 'Llama', 'Mapache', 'Mono', 'Cerdo', 'Gallina', 'Hiena', 'Burro', 'Pulpo', 'Camello'],  
  'Lugares 🌎': ['París', 'Nueva York', 'Roma', 'Las Vegas', 'Área 51', 'Chernobyl', 'Polo Norte', 'Venecia', 'El Vaticano', 'Dubai', 'Hawái', 'Machu Picchu', 'Hollywood', 'Transilvania', 'Australia', 'Egipto', 'Amazonas'],  
  'Random 🎲': ['Inodoro', 'Dentífrico', 'Control Remoto', 'Media sucia', 'Cuchara', 'Papel Higiénico', 'Semáforo', 'Paraguas']
};

const renderLobby = (game: any) => {
  let playerNames = Array.from(game.playerData.values()).map((p: any) => `- ${p.name}`).join('\n');
  
  // Display amigable: -1 es el Modo Caos
  let impDisplay = game.settings.impostors === -1 ? "🌀 Modo Caos" : game.settings.impostors;

  const text = `🎮 *¡Partida creada por ${game.hostName}!* \n\n` +
               `⚙️ *CONFIGURACIÓN:*\n` +
               `📚 Categoría: ${game.settings.category}\n` +
               `😈 Impostores: ${impDisplay}\n\n` +
               `👥 JUGADORES (${game.players.size}):\n${playerNames}\n\n` +
               `Toquen abajo para entrar:`;
               
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✋ Unirse a la partida', 'join_game')],
    [
      Markup.button.callback('📚 Categoría', 'menu_cat'),
      Markup.button.callback(`😈 Imp: ${impDisplay}`, 'toggle_imp')
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

  bot.catch((err: any, ctx) => { console.error(`Error:`, err); });

  bot.start(async (ctx) => {
    await ctx.replyWithMarkdown(`👋 ¡Hola ${ctx.from.first_name}!\n\nYa estoy listo para enviarte tus roles.\n\n📍 Usa /iniciar en tu grupo para jugar.`);
  });

  bot.command('iniciar', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("❌ Usa este comando en un grupo.");
    const chatId = ctx.chat.id;
    if (activeGames.has(chatId)) return ctx.reply("⚠️ Ya hay una sala abierta.");

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

  bot.action('reset_group_points', async (ctx) => {
    const chatId = ctx.chat?.id;
    const game = chatId ? activeGames.get(chatId) : null;
    
    if (!game) return ctx.answerCbQuery("❌ Debes abrir una sala con /iniciar para gestionar los puntos.");
    if (game.hostId !== ctx.from.id) return ctx.answerCbQuery("❌ Solo el anfitrión puede reiniciar los puntos.", { show_alert: true });

    try {
      await storage.resetChatStats(chatId!.toString());
      await ctx.answerCbQuery("✅ ¡Puntos del grupo reseteados!", { show_alert: true });
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    } catch (e) {
      await ctx.answerCbQuery("❌ Error al acceder a la base de datos.");
    }
  });

  bot.action('cancel_game', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el anfitrión.");
    
    activeGames.delete(ctx.chat!.id);
    await ctx.answerCbQuery("Partida cancelada");
    await ctx.editMessageText("🛑 *Partida cancelada por el anfitrión.*", { parse_mode: 'Markdown' });
  });

  bot.action('menu_cat', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👤 Personas', 'cat_Personas 👤'), Markup.button.callback('🎬 Películas', 'cat_Películas 🎬')],
      [Markup.button.callback('🦸‍♂️ Personajes', 'cat_Personajes 🦸‍♂️'), Markup.button.callback('🧠 Teorías', 'cat_Teorías 🧠')],
      [Markup.button.callback('🎮 Juegos', 'cat_Videojuegos 🎮'), Markup.button.callback('🦁 Animales', 'cat_Animales 🦁')],
      [Markup.button.callback('🌎 Lugares', 'cat_Lugares 🌎'), Markup.button.callback('🎲 Random', 'cat_Random 🎲')],
      [Markup.button.callback('🔙 Volver', 'back_lobby')]
    ]);
    await ctx.editMessageText("Selecciona categoría:", keyboard);
  });

  bot.action(/cat_(.+)/, async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (game && game.hostId === ctx.from.id) {
      game.settings.category = ctx.match[1];
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    }
  });

  bot.action('toggle_imp', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    
    // Ciclo: 1 -> 2 -> Modo Caos (-1) -> 1
    if (game.settings.impostors === 1) game.settings.impostors = 2;
    else if (game.settings.impostors === 2) game.settings.impostors = -1;
    else game.settings.impostors = 1;

    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
  });

  bot.action('join_game', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.state !== 'waiting') return ctx.answerCbQuery("No hay sala.");
    if (game.players.has(ctx.from.id)) return ctx.answerCbQuery("Ya estás dentro.");
    game.players.add(ctx.from.id);
    game.playerData.set(ctx.from.id, { id: ctx.from.id, name: ctx.from.first_name });
    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
  });

  bot.action('back_lobby', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (game) {
      const { text, keyboard } = renderLobby(game);
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
    }
  });

  bot.action('start_game', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return;
    if (game.players.size < 3) return ctx.answerCbQuery("Mínimo 3 personas.", { show_alert: true });

    game.state = 'playing';
    const playersArray = Array.from(game.players);
    playersArray.sort(() => Math.random() - 0.5);

    // LÓGICA DE INCERTIDUMBRE (Modo Caos)
    let numImpostors = game.settings.impostors;
    if (numImpostors === -1) {
      const rand = Math.random();
      if (rand < 0.15) numImpostors = 0; // 15% Nadie
      else if (rand < 0.30) numImpostors = game.players.size; // 15% Todos (Caos secreto)
      else if (rand < 0.70) numImpostors = 1; // 40% Uno
      else numImpostors = 2; // 30% Dos
    }

    game.impostors = new Set(playersArray.slice(0, numImpostors));
    
    let finalCat = game.settings.category;
    if (finalCat === 'Aleatorio' || !CATEGORIES[finalCat]) {
      const cats = Object.keys(CATEGORIES);
      finalCat = cats[Math.floor(Math.random() * cats.length)];
    }

    const words = CATEGORIES[finalCat];
    const secretWord = words[Math.floor(Math.random() * words.length)];

    for (const p of game.players) {
      const isImp = game.impostors.has(p as number);
      const roleText = isImp 
        ? `😈 *ERES EL IMPOSTOR*\n\nCategoría: ${finalCat}\n\nNo tienes palabra. ¡Miente!` 
        : `👨‍💼 *ERES CIUDADANO*\n\nCategoría: ${finalCat}\nPalabra: *${secretWord}*`;
      bot.telegram.sendMessage(p as number, roleText, { parse_mode: 'Markdown' }).catch(() => {});
    }

    const starter = game.playerData.get(playersArray[Math.floor(Math.random() * playersArray.length)]).name;
    const impDisplay = game.settings.impostors === -1 ? "❓ Desconocido (Caos)" : numImpostors;

    await ctx.editMessageText(`🚨 ¡A JUGAR! 🚨\n\n📚 Categoría: *${finalCat}*\n😈 Impostores: *${impDisplay}*\n🗣 Empieza: *${starter}*`, 
      Markup.inlineKeyboard([[Markup.button.callback('🏆 Ciudadanos', 'win_cits'), Markup.button.callback('🏆 Impostores', 'win_imp')]])
    );
  });

  bot.action(['win_cits', 'win_imp'], async (ctx) => {
    const chatId = ctx.chat!.id;
    const game = activeGames.get(chatId);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el host.");

    await ctx.answerCbQuery("Calculando resultados...");

    const winner = ctx.callbackQuery.data === 'win_cits' ? 'ciudadanos' : 'impostores';
    let result = `🏆 *¡GANAN LOS ${winner.toUpperCase()}!* 🏆\n\n📊 *PUNTOS:*\n`;

    const playersList = Array.from(game.players);
    const updatePromises = playersList.map(async (p) => {
        const isImp = game.impostors.has(p as number);
        let pts = (winner === 'impostores' && isImp) ? 3 : (winner === 'ciudadanos' && !isImp) ? 1 : 0;
        const name = game.playerData.get(p as number)?.name || "Jugador";
        const player = await storage.updatePlayerPoints(p.toString(), chatId.toString(), pts, name);
        // Marcador con círculo azul
        return `${pts > 0 ? '🔵' : '⚪️'} ${name}: +${pts} (Total: ${player.points})\n`;
    });

    result += (await Promise.all(updatePromises)).join('');
    activeGames.delete(chatId);
    await ctx.editMessageText(result, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Otra partida', 'play_again')]]) });
  });

  bot.action('play_again', async (ctx) => {
    const chatId = ctx.chat!.id;
    activeGames.delete(chatId);
    
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

  bot.launch().then(() => console.log("🚀 BOT ONLINE"));

  // ⚠️ CAMBIA ESTO POR TU URL DE RENDER PARA QUE NO SE DUERMA
  const URL_DE_TU_APP = "https://tu-proyecto.onrender.com"; 
  setInterval(() => {
    fetch(URL_DE_TU_APP).catch(() => {});
  }, 10 * 60 * 1000);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
