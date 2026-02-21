import { Telegraf, Markup } from 'telegraf';
import { storage } from './storage';

const activeGames = new Map<number, any>();

// --- NUEVAS CATEGORÍAS ACTUALIZADAS ---
const CATEGORIES: Record<string, string[]> = {
  'Amigos 👥': ['Gheo', 'Nico', 'Ramirin', 'Presi', 'El Impostor', 'El más manco', 'El que siempre miente'],
  'Películas 🎬': ['Titanic', 'Avatar', 'Star Wars', 'Harry Potter', 'El Rey León', 'Jurassic Park', 'Toy Story', 'Shrek', 'Batman', 'Spider-Man', 'Avengers', 'Coco', 'Joker'],
  'Personajes 🦸‍♂️': ['Homero Simpson', 'Pikachu', 'Superman', 'Mickey Mouse', 'Darth Vader', 'Bob Esponja', 'Goku', 'Mario Bros', 'Barbie', 'Iron Man'],
  'Teorías 🧠': ['Relatividad', 'Evolución', 'Big Bang', 'Gravedad', 'Agujero Negro', 'ADN', 'Selección Natural', 'Efecto Mandela'],
  'Videojuegos 🎮': ['Minecraft', 'Roblox', 'Fortnite', 'FIFA', 'Grand Theft Auto', 'League of Legends', 'Among Us', 'Free Fire', 'Pac-Man'],
  'Animales 🦁': ['León', 'Elefante', 'Tigre', 'Jirafa', 'Delfín', 'Pingüino', 'Oso', 'Lobo', 'Tiburón', 'Cocodrilo'],
  'Lugares 🌎': ['París', 'Nueva York', 'Egipto', 'Roma', 'Japón', 'Amazonas', 'China', 'México', 'España'],
  'Random 🎲': ['Inodoro', 'Dentífrico', 'Control Remoto', 'Media sucia', 'Cuchara', 'Papel Higiénico', 'Semáforo', 'Paraguas']
};

const renderLobby = (game: any) => {
  let playerNames = Array.from(game.playerData.values()).map((p: any) => `- ${p.name}`).join('\n');
  
  // Mostrar "Caos" si la configuración de impostores es especial
  let impDisplay = game.settings.impostors === -1 ? "🎲 Aleatorio (0-2)" : 
                   game.settings.impostors === 99 ? "🔥 ¡TODOS IMPOSTORES!" : 
                   game.settings.impostors;

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
    ]
  ]);
  return { text, keyboard };
};

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const bot = new Telegraf(token);

  bot.catch((err: any, ctx) => { console.error(`Error:`, err); });

  bot.start(async (ctx) => {
    await ctx.replyWithMarkdown(`👋 ¡Hola ${ctx.from.first_name}!\n\nYa estoy listo para enviarte tus palabras secretas.\n\n📍 Usa /iniciar en tu grupo para jugar.`);
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

  // --- LÓGICA DE CATEGORÍAS ---
  bot.action('menu_cat', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👥 Amigos', 'cat_Amigos 👥'), Markup.button.callback('🎬 Películas', 'cat_Películas 🎬')],
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

  // --- LÓGICA DE IMPOSTORES (MODO CAOS) ---
  bot.action('toggle_imp', async (ctx) => {
    const game = activeGames.get(ctx.chat!.id);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo anfitrión.");
    
    // Ciclo: 1 -> 2 -> Aleatorio (0-2) -> Todos Impostores -> 1
    if (game.settings.impostors === 1) game.settings.impostors = 2;
    else if (game.settings.impostors === 2) game.settings.impostors = -1; // -1 significa Aleatorio
    else if (game.settings.impostors === -1) game.settings.impostors = 99; // 99 significa Todos
    else game.settings.impostors = 1;

    const { text, keyboard } = renderLobby(game);
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
  });

  // --- RESTO DE ACCIONES (JOIN, STATS, ETC) ---
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

    // DETERMINAR CANTIDAD DE IMPOSTORES
    let numImpostors = game.settings.impostors;
    if (numImpostors === -1) numImpostors = Math.floor(Math.random() * 3); // 0, 1 o 2
    if (numImpostors === 99) numImpostors = game.players.size; // Todos

    game.impostors = new Set(playersArray.slice(0, numImpostors));
    
    let finalCat = game.settings.category;
    if (!CATEGORIES[finalCat]) {
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
    await ctx.editMessageText(`🚨 ¡A JUGAR! (Impostores: ${numImpostors})\n\n📚 Categoría: *${finalCat}*\n🗣 Empieza: *${starter}*`, 
      Markup.inlineKeyboard([[Markup.button.callback('🏆 Ciudadanos', 'win_cits'), Markup.button.callback('🏆 Impostores', 'win_imp')]])
    );
  });

  // --- FINALIZACIÓN ---
  bot.action(['win_cits', 'win_imp'], async (ctx) => {
    const chatId = ctx.chat!.id;
    const game = activeGames.get(chatId);
    if (!game || game.hostId !== ctx.from.id) return ctx.answerCbQuery("Solo el host.");

    const winner = ctx.callbackQuery.data === 'win_cits' ? 'ciudadanos' : 'impostores';
    let result = `🏆 *¡GANAN LOS ${winner.toUpperCase()}!* 🏆\n\n📊 *PUNTOS:*\n`;

    const playersList = Array.from(game.players);
    const updatePromises = playersList.map(async (p) => {
        const isImp = game.impostors.has(p as number);
        let pts = (winner === 'impostores' && isImp) ? 3 : (winner === 'ciudadanos' && !isImp) ? 1 : 0;
        const name = game.playerData.get(p as number)?.name || "Jugador";
        const player = await storage.updatePlayerPoints(p.toString(), chatId.toString(), pts, name);
        return `${pts > 0 ? '🔵' : '⚪️'} ${name}: +${pts} (Total: ${player.points})\n`;
    });

    result += (await Promise.all(updatePromises)).join('');
    activeGames.delete(chatId);
    await ctx.editMessageText(result, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Otra partida', 'play_again')]]) });
  });

  bot.action('play_again', async (ctx) => {
    // Redirige al comando iniciar simplificado
    const chatId = ctx.chat!.id;
    activeGames.delete(chatId);
    // @ts-ignore
    return bot.handleUpdate(ctx.update); 
  });

  // --- SISTEMA ANTI-SUEÑO ---
  bot.launch().then(() => console.log("🚀 BOT ONLINE"));

  const URL_DE_TU_APP = "https://tu-proyecto.onrender.com"; // CAMBIA ESTO
  setInterval(() => {
    fetch(URL_DE_TU_APP).catch(() => {});
  }, 10 * 60 * 1000);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
