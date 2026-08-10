export interface FightEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  prizePool?: string;
  isLive: boolean;
  fightsCount: number;
}

export interface FightMatch {
  number: number;
  roosterRed: string;
  ownerRed: string;
  roosterBlue: string;
  ownerBlue: string;
  weight: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  winner?: 'red' | 'blue' | 'draw';
  timeElapsed?: string;
}
