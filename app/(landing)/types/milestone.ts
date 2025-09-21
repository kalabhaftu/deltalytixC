
export type Milestone = {
  id: number;
  title: string;
  description: string;
  image?: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  estimatedDate?: string;
  completedDate?: string;
}