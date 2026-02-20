import { motion } from "framer-motion";
import { CyberButton } from "@/components/CyberButton";
import { FeatureCard } from "@/components/FeatureCard";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Leaderboard } from "@/components/Leaderboard";
import { Shield, Users, Trophy, Bot, ChevronRight, Zap } from "lucide-react";

export default function Landing() {
  const BOT_URL = "https://t.me/ElImpostorProBot?startgroup=true";

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Elements */}
      <div className="absolute inset-0 cyber-grid z-0 pointer-events-none" />
      
      {/* Navbar / Header */}
      <header className="relative z-50 w-full border-b border-primary/10 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            <span className="font-display font-bold text-xl tracking-wider text-glow">
              EL IMPOSTOR <span className="text-primary">PRO</span>
            </span>
          </div>
          <StatusIndicator />
        </div>
      </header>

      <main className="flex-grow relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative py-20 lg:py-32 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6 inline-block"
          >
            <span className="px-3 py-1 rounded border border-primary/30 bg-primary/10 text-primary text-sm font-mono tracking-widest uppercase">
              v2.0 Sistema Operativo
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 max-w-4xl mx-auto leading-tight"
          >
            EL JUEGO DE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 text-glow">
              DEDUCCIÓN SOCIAL
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-sans"
          >
            Descubre quién miente en tu grupo de Telegram. Roles secretos, 
            votaciones en tiempo real y estadísticas permanentes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
              <CyberButton pulse className="text-xl px-10 py-6">
                Añadir al Grupo
              </CyberButton>
            </a>
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-20 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield}
              title="Privacidad Total"
              description="Los roles se distribuyen por Mensaje Directo. Nadie sabrá quién eres hasta que sea demasiado tarde."
              delay={0.2}
            />
            <FeatureCard 
              icon={Users}
              title="Multi-Impostor"
              description="Soporte para grupos grandes. Múltiples impostores trabajando en las sombras para sabotear la deducción."
              delay={0.4}
            />
            <FeatureCard 
              icon={Trophy}
              title="Marcador Permanente"
              description="Base de datos global. Cada victoria cuenta. Escala en el ranking y demuestra tu superioridad intelectual."
              delay={0.6}
            />
          </div>
        </section>

        {/* HOW TO PLAY SECTION */}
        <section className="py-20 bg-primary/5 border-y border-primary/10">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16 text-glow">Protocolo de Inicio</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 z-0" />

              {[
                { 
                  step: "01", 
                  title: "Despliegue", 
                  desc: "Añade el bot a tu grupo de Telegram y dale permisos de administrador." 
                },
                { 
                  step: "02", 
                  title: "Reclutamiento", 
                  desc: "Los miembros se unen pulsando el botón 'Unirse al Juego' en el chat." 
                },
                { 
                  step: "03", 
                  title: "Infiltración", 
                  desc: "El bot envía roles secretos por DM. ¡Que comience el debate!" 
                }
              ].map((item, idx) => (
                <motion.div 
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  viewport={{ once: true }}
                  className="relative z-10 flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 rounded-full glass-panel border-2 border-primary flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(11,87,208,0.3)]">
                    <span className="font-display text-4xl font-bold text-primary">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* LEADERBOARD SECTION */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-glow">Salón de la Fama</h2>
            <p className="text-muted-foreground text-lg">Los agentes más letales de la red.</p>
          </div>
          <Leaderboard />
        </section>

        {/* CTA FOOTER */}
        <section className="py-24 text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">¿Listo para la misión?</h2>
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
              <CyberButton pulse className="px-12 py-6 text-xl">
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Iniciar Protocolo
                </span>
              </CyberButton>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-primary/10 bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm font-mono">
          <p>© 2024 EL IMPOSTOR PRO. Todos los derechos reservados.</p>
          <p className="mt-2 opacity-50">Sistema seguro. Encriptación de extremo a extremo.</p>
        </div>
      </footer>
    </div>
  );
}
