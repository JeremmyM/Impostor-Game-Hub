import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  pulse?: boolean;
}

export function CyberButton({ 
  children, 
  className, 
  variant = "primary", 
  pulse = false,
  ...props 
}: CyberButtonProps) {
  const baseStyles = "relative px-8 py-4 font-display font-bold text-lg uppercase tracking-widest transition-all duration-300 clip-path-slant";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80 box-glow border border-primary/50",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary/50",
    outline: "bg-transparent text-primary border-2 border-primary hover:bg-primary/10 hover:box-glow"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        baseStyles,
        variants[variant],
        pulse && "animate-pulse shadow-[0_0_20px_rgba(11,87,208,0.6)]",
        className
      )}
      {...props}
    >
      {/* Decorative corner accents */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/50" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/50" />
      
      {children}
    </motion.button>
  );
}
