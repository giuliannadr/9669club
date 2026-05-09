'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScroll } from '../hooks/use-scroll';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } },
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isScrolled = useScroll(50);

  return (
    <div className="bg-[#050505] min-h-screen text-[#f0f0f0] font-sans selection:bg-gray-700 selection:text-white">
      {/* Navbar con transición de opacidad basada en el Scroll */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled 
            ? 'bg-[#0a0a0a]/80 backdrop-blur-md py-4 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]' 
            : 'bg-transparent py-8'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <span className="text-xl font-medium tracking-[0.2em] uppercase text-white/90">Studio AV</span>
          <nav className="hidden md:flex gap-8 text-sm font-light tracking-widest text-gray-400">
            <a href="#work" className="hover:text-white transition-colors duration-300">WORK</a>
            <a href="#services" className="hover:text-white transition-colors duration-300">SERVICES</a>
            <a href="#contact" className="hover:text-white transition-colors duration-300">CONTACT</a>
          </nav>
        </div>
      </header>

      {/* Transiciones de Página con Framer Motion */}
      <AnimatePresence mode="wait">
        <motion.main
          key="page-content"
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="flex flex-col w-full"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
};
