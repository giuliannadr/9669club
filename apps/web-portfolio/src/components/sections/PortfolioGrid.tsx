'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Project } from '@shared/types';
import { fetchProjects } from '../../features/portfolio/api';

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  }
};

export const PortfolioGrid: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  return (
    <section id="work" className="py-32 px-6 md:px-12 bg-[#050505]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-light tracking-[0.15em] text-white/90">
          FEATURED <span className="text-gray-500 italic font-semibold">WORK</span>
        </h2>
      </motion.div>

      {/* Bento Grid */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        transition={{ staggerChildren: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-12 auto-rows-[350px] md:auto-rows-[450px] gap-6"
      >
        {projects.map((project, index) => {
          // Asymmetric Bento Grid layout
          const isLarge = index === 0; // First item spans larger
          const colSpan = isLarge ? 'md:col-span-8' : 'md:col-span-4';
          const rowSpan = isLarge ? 'md:row-span-2' : 'md:row-span-1';

          return (
            <motion.div
              key={project.id}
              variants={itemVariants}
              className={`relative overflow-hidden group cursor-pointer rounded-[2px] bg-[#0a0a0a] ${colSpan} ${rowSpan}`}
            >
              {/* Background Image with Slow Zoom on Hover */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                style={{ backgroundImage: `url(${project.thumbnailUrl})` }}
              />
              
              {/* Soft Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/95 via-[#050505]/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-700" />

              {/* Information Reveal on Hover */}
              <div className="absolute bottom-0 left-0 p-8 w-full translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <p className="text-[10px] tracking-[0.25em] text-gray-400 mb-3 uppercase">{project.category}</p>
                <h3 className="text-3xl font-light tracking-[0.05em] text-white mb-2">{project.title}</h3>
                
                <div className="overflow-hidden h-0 group-hover:h-auto transition-all duration-700">
                  <p className="text-gray-300 text-sm font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100 mt-2">
                    Client: {project.client} <br />
                    <span className="text-gray-500 mt-1 block">{project.description}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
};
