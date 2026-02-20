import { useStats } from "@/hooks/use-stats";
import { Trophy, Medal, User, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export function Leaderboard() {
  const { data: stats, isLoading } = useStats();

  const handleReset = async () => {
    if (window.confirm("⚠️ ¿Seguro que quieres borrar TODOS los puntos y jugadores? Esto no se puede deshacer.")) {
      try {
        await fetch("/api/reset", { method: "POST" });
        window.location.reload();
      } catch (e) {
        alert("Error al reiniciar los puntos");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 glass-panel rounded-2xl animate-pulse">
        <div className="h-8 bg-primary/10 rounded w-1/3 mb-6 mx-auto"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-primary/5 rounded border border-primary/10"></div>
          ))}
        </div>
      </div>
    );
  }

  const topPlayers = stats?.topPlayers || [];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-panel rounded-2xl overflow-hidden border-primary/30">
        <div className="p-6 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="text-xl font-bold text-foreground">Agentes de Élite</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono text-muted-foreground">
              Total Jugadores: <span className="text-primary font-bold">{stats?.totalPlayers || 0}</span>
            </div>
            {/* BOTÓN DE REINICIO AÑADIDO */}
            <button 
              onClick={handleReset}
              className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded text-xs font-bold transition-colors"
              title="Borrar todos los puntos"
            >
              <Trash2 className="w-4 h-4" /> RESETEAR
            </button>
          </div>
        </div>

        <div className="divide-y divide-primary/10">
          {topPlayers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono">
              Esperando datos de la primera misión...
            </div>
          ) : (
            topPlayers.map((player, index) => (
              <motion.div 
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-display font-bold text-xl text-primary/50">
                  {index === 0 ? <Medal className="text-yellow-500 w-6 h-6" /> : 
                   index === 1 ? <Medal className="text-gray-400 w-6 h-6" /> :
                   index === 2 ? <Medal className="text-amber-700 w-6 h-6" /> : 
                   `#${index + 1}`}
                </div>
                
                <div className="flex-grow">
                  <div className="font-bold text-foreground font-mono text-lg">
                    {player.firstName || player.username || "Agente Desconocido"}
                  </div>
                  {player.username && (
                    <div className="text-xs text-muted-foreground">@{player.username}</div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary font-display">
                    {player.points}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">PTS</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
