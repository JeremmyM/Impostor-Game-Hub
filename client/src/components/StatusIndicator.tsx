import { motion } from "framer-motion";

export function StatusIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel border-primary/30">
      <div className="relative flex items-center justify-center w-3 h-3">
        <motion.span 
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-primary"
        />
        <span className="relative w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#0b57d0]" />
      </div>
      <span className="font-mono text-sm tracking-widest text-primary font-bold">
        SISTEMA ONLINE
      </span>
    </div>
  );
}
