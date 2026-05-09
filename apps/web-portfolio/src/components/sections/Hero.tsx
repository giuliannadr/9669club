'use client';

import React, { useRef } from 'react';
import { motion, useScroll as useFramerScroll, useTransform } from 'framer-motion';

export const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax bindings
  const { scrollYProgress } = useFramerScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const yText = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const opacityText = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section 
      ref={containerRef} 
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#050505]"
    >
      {/* Background Video w/ Lazy Loading */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10" /> {/* Overlay for contrast */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          className="w-full h-full object-cover opacity-80"
          poster="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000&auto=format&fit=crop"
        >
          {/* Lazy loaded cinematic video */}
          <source src="https://cdn.pixabay.com/vimeo/328940142/city-22879.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Cinematic Text Content */}
      <motion.div 
        style={{ y: yText, opacity: opacityText }}
        className="relative z-20 flex flex-col items-center text-center px-4"
      >
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="text-5xl md:text-[6rem] leading-none font-light tracking-[0.1em] text-white/95 mb-6"
        >
          CRAFTING <br />
          <span className="font-semibold italic text-[#e0e0e0]">VISUAL</span> EMOTION
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="text-gray-300 font-light tracking-[0.05em] max-w-lg mx-auto text-lg md:text-xl"
        >
          A gourmet audiovisual agency dedicated to telling stories that resonate deeply.
        </motion.p>
      </motion.div>

      {/* Animated Scroll Down Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] tracking-[0.4em] text-gray-400 uppercase font-light">Scroll</span>
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-[1px] h-12 bg-gradient-to-b from-gray-400 to-transparent"
        />
      </motion.div>
    </section>
  );
};
