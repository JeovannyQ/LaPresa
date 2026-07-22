export interface FightEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  prizePool?: string;
  isLive: boolean;
  twitchChannel: string;
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

export interface TwitchChannelConfig {
  mainChannel: string;
  secondaryChannel: string;
}
