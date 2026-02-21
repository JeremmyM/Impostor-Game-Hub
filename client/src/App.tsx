import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

function Router() {
  return (
    <Switch>
      {/* Ruta para el ranking global */}
      <Route path="/" component={Landing} />
      
      {/* NUEVA RUTA: Captura el ID del grupo (chatId) y carga la misma página Landing */}
      <Route path="/ranking/:chatId" component={Landing} />
      
      {/* Si no coincide con ninguna de las anteriores, muestra 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
