export interface Project {
  id: string;
  title: string;
  client: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
}

export interface Evento {
  id: string;
  title: string;
  status: 'live' | 'upcoming' | 'ended';
  date: string;
  room?: string;
  qrCode?: string;
}

export interface Presupuesto {
  id: string;
  clientName: string;
  amount: number;
  status: 'pending' | 'signed' | 'paid' | 'rejected';
  date: string;
}

export interface ContentTask {
  id: string;
  title: string;
  description: string;
  status: 'idea' | 'scripting' | 'production' | 'editing' | 'review' | 'published';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  dueDate?: string;
}
