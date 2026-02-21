import { useQuery } from "@tanstack/react-query";
import { Player } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Trash2 } from "lucide-react";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

export function Leaderboard() {
  // Detectamos si hay un chatId en la URL
  const [, params] = useRoute("/ranking/:chatId");
  const chatId = params?.chatId;

  // Si hay chatId usamos la ruta de grupo, si no, la general
  const queryPath = chatId ? `/api/players/chat/${chatId}` : "/api/players";

  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: [queryPath],
  });

  const handleReset = async () => {
    if (confirm("¿Estás seguro de que quieres resetear los puntos de este grupo?")) {
      // Aquí podrías implementar una ruta de borrado por chatId si lo deseas
      alert("Función de reseteo en desarrollo para grupos individuales.");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Cargando ranking...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Card className="max-w-4xl mx-auto border-t-8" style={{ borderColor: '#0b57d0' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div>
            <CardTitle className="text-3xl font-bold flex items-center gap-2" style={{ color: '#0b57d0' }}>
              <Trophy className="h-8 w-8 text-yellow-500" />
              {chatId ? "Ranking del Grupo" : "Ranking Global"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {chatId ? `ID del Grupo: ${chatId}` : "Todos los jugadores registrados"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Total Jugadores</p>
              <p className="text-2xl font-bold">{players?.length || 0}</p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleReset}
              className="flex gap-2"
            >
              <Trash2 className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[80px]">Posición</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-right">Partidas</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Puntos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.map((player, index) => (
                <TableRow key={player.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="font-medium">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-700">{player.firstName}</div>
                    {player.username && <div className="text-xs text-slate-400">@{player.username}</div>}
                  </TableCell>
                  <TableCell className="text-right">{player.gamesPlayed}</TableCell>
                  <TableCell className="text-right font-bold text-lg" style={{ color: '#0b57d0' }}>
                    {player.points}
                  </TableCell>
                </TableRow>
              ))}
              {players?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No hay jugadores registrados en este grupo aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="text-center mt-8 text-slate-400 text-xs">
        &copy; 2026 Impostor Game Hub | Estilo corporativo aplicado
      </div>
    </div>
  );
}
