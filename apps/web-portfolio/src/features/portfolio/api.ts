import { Project } from '@shared/types';

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Neon Nights',
    client: 'CyberTech',
    category: 'Commercial',
    videoUrl: 'https://cdn.pixabay.com/vimeo/328940142/city-22879.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=2000&auto=format&fit=crop',
    description: 'A cinematic exploration of urban nightlife.',
  },
  {
    id: '2',
    title: 'Echoes of Nature',
    client: 'NatGeo',
    category: 'Documentary',
    videoUrl: 'https://cdn.pixabay.com/vimeo/143169724/nature-1033.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2000&auto=format&fit=crop',
    description: 'Capturing the raw beauty of untamed landscapes.',
  },
  {
    id: '3',
    title: 'Urban Flow',
    client: 'Nike',
    category: 'Music Video',
    videoUrl: 'https://cdn.pixabay.com/vimeo/269176461/urban-15964.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=2000&auto=format&fit=crop',
    description: 'High-energy street dance choreography.',
  },
];

/**
 * Mocks the API fetch. Leaves the space ready to integrate the real 
 * monorepo backend (NestJS/Express) using React Query.
 */
export const fetchProjects = async (): Promise<Project[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_PROJECTS);
    }, 800); // Simulate network latency for transitions
  });
};
