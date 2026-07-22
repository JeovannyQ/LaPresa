import { FightEvent, FightMatch } from '../types';

export const INITIAL_EVENTS: FightEvent[] = [
  {
    id: 'evt-1',
    title: 'Gran Jugada de Fin de Semana - Presa de Tavera',
    date: 'Sábado, 26 de Julio',
    time: '3:00 PM',
    description: 'Encuentro con las mejores traba del Cibao. Premios especiales para la pelea más rápida.',
    prizePool: 'RD$ 150,000 en Premios',
    isLive: true,
    twitchChannel: 'galleralapresa',
    fightsCount: 24,
  },
  {
    id: 'evt-2',
    title: 'Torneo Clásico Estelar - Copa La Presa',
    date: 'Domingo, 27 de Julio',
    time: '2:00 PM',
    description: 'Desafío inter-clubes con trabas invitadas de Santiago, La Vega y Moca.',
    prizePool: 'RD$ 300,000 acumulados',
    isLive: false,
    twitchChannel: 'galleralapresa',
    fightsCount: 30,
  },
  {
    id: 'evt-3',
    title: 'Jugada Tradicional de Viernes',
    date: 'Viernes, 1 de Agosto',
    time: '4:00 PM',
    description: 'Peleas de gallos en todas las categorías de peso oficial.',
    prizePool: 'RD$ 80,000',
    isLive: false,
    twitchChannel: 'galleralapresa',
    fightsCount: 18,
  }
];

export const CURRENT_FIGHTS: FightMatch[] = [
  {
    number: 12,
    roosterRed: 'Gallo Indio Púa Dorada',
    ownerRed: 'Traba Don Pedro (Santiago)',
    roosterBlue: 'Gallo Cenizo Jalao',
    ownerBlue: 'Traba Los Hermanos (Tavera)',
    weight: '3.12 lbs',
    status: 'completed',
    winner: 'red',
    timeElapsed: '4:25 min'
  },
  {
    number: 13,
    roosterRed: 'Gallo Jabao',
    ownerRed: 'Traba El Dique',
    roosterBlue: 'Gallo Gallino Giro',
    ownerBlue: 'Traba La Cumbre',
    weight: '3.10 lbs',
    status: 'completed',
    winner: 'blue',
    timeElapsed: '6:10 min'
  },
  {
    number: 14,
    roosterRed: 'Gallo Marañón Estelar',
    ownerRed: 'Traba La Presa (Local)',
    roosterBlue: 'Gallo Tuerto Pinto',
    ownerBlue: 'Traba Don Luis (La Vega)',
    weight: '3.14 lbs',
    status: 'in_progress',
    timeElapsed: '3:45 min'
  },
  {
    number: 15,
    roosterRed: 'Gallo Canelo Sombra',
    ownerRed: 'Traba Los Compadres',
    roosterBlue: 'Gallo Indio Furia',
    ownerBlue: 'Traba El Yaque',
    weight: '4.00 lbs',
    status: 'upcoming'
  },
  {
    number: 16,
    roosterRed: 'Gallo Blanco Puro',
    ownerRed: 'Traba El Embalse',
    roosterBlue: 'Gallo Giro Rayado',
    ownerBlue: 'Traba Sabana Iglesia',
    weight: '3.11 lbs',
    status: 'upcoming'
  }
];
