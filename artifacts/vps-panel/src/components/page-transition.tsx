import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <motion.div
      key={location}
      initial={{ opacity: 0, y: 15, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.99 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
