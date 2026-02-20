import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="group relative p-6 glass-panel rounded-xl overflow-hidden hover:border-primary/50 transition-colors duration-300"
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 p-4 rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
          <Icon className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(11,87,208,0.5)]" />
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        
        <p className="text-muted-foreground font-sans text-lg leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
