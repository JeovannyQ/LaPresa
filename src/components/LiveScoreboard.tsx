import React, { useState } from 'react';
import { Swords, Trophy, Clock, Shield, Flame, CheckCircle, ChevronRight, Scale } from 'lucide-react';
import { FightMatch } from '../types';

interface LiveScoreboardProps {
  matches: FightMatch[];
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({ matches }) => {
  const [matchList, setMatchList] = useState<FightMatch[]>(matches);

  const currentMatch = matchList.find(m => m.status === 'in_progress') || matchList[2];
  const completedMatches = matchList.filter(m => m.status === 'completed');
  const upcomingMatches = matchList.filter(m => m.status === 'upcoming');

  return (
    <section className="py-16 bg-[#0c0c0c] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em]">
              <Swords className="w-3.5 h-3.5" />
              <span>Cartelera de Peleas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-white mt-1">
              PIZARRA EN <span className="text-red-600">VIVO</span>
            </h2>
          </div>
          <div className="text-[10px] bg-[#151515] border border-white/10 text-zinc-300 px-4 py-2 rounded-sm font-mono flex items-center gap-2 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>Pelea Activa #{currentMatch.number}</span>
          </div>
        </div>

        {/* Current Fight Spotlight Box */}
        <div className="bg-[#151515] border border-white/10 rounded-sm p-6 sm:p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] mb-10 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 shadow">
            EN CURSO • RUEDO PRINCIPAL
          </div>

          <div className="text-center mb-6">
            <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-[0.3em]">
              PELEA NÚMERO #{currentMatch.number}
            </span>
            <div className="flex items-center justify-center gap-3 text-zinc-400 text-xs font-mono mt-1 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-red-600" /> Peso: <strong className="text-white">{currentMatch.weight}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-red-600" /> Tiempo: <strong className="text-white">{currentMatch.timeElapsed || '3:45 min'}</strong></span>
            </div>
          </div>

          {/* Versus Matchup */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
            
            {/* Esquina Roja */}
            <div className="md:col-span-5 bg-black border border-red-600/40 p-5 rounded-sm text-center md:text-right relative">
              <span className="absolute top-2 left-3 text-[9px] font-black tracking-[0.2em] text-red-500 uppercase bg-red-950/80 px-2 py-0.5 border border-red-800/40">
                ESQUINA ROJA
              </span>
              <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mt-3">
                {currentMatch.roosterRed}
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-wider">
                {currentMatch.ownerRed}
              </p>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-lg border border-white/20">
                VS
              </div>
            </div>

            {/* Esquina Azul */}
            <div className="md:col-span-5 bg-black border border-blue-600/40 p-5 rounded-sm text-center md:text-left relative">
              <span className="absolute top-2 right-3 text-[9px] font-black tracking-[0.2em] text-blue-400 uppercase bg-blue-950/80 px-2 py-0.5 border border-blue-800/40">
                ESQUINA AZUL
              </span>
              <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mt-3">
                {currentMatch.roosterBlue}
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-wider">
                {currentMatch.ownerBlue}
              </p>
            </div>

          </div>

        </div>

        {/* Matches Grid Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Completed Fights */}
          <div className="bg-[#151515] rounded-sm p-5 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <CheckCircle className="w-4 h-4 text-red-600" />
              Peleas Finalizadas
            </h3>

            <div className="space-y-3">
              {completedMatches.map((m) => (
                <div key={m.number} className="bg-black p-3.5 rounded-sm border border-white/10 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-sm bg-zinc-900 text-red-500 font-mono font-bold flex items-center justify-center border border-white/10 text-xs">
                      #{m.number}
                    </span>
                    <div>
                      <div className="font-bold text-white uppercase tracking-wider">
                        {m.roosterRed} vs {m.roosterBlue}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Peso: {m.weight} • Tiempo: {m.timeElapsed}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-sm font-bold text-[9px] uppercase tracking-widest ${
                      m.winner === 'red' ? 'bg-red-950 text-red-400 border border-red-800/60' : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                    }`}>
                      Ganador: {m.winner === 'red' ? 'Roja' : 'Azul'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Fights */}
          <div className="bg-[#151515] rounded-sm p-5 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Clock className="w-4 h-4 text-red-600" />
              Próximas Peleas en Turno
            </h3>

            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <div key={m.number} className="bg-black p-3.5 rounded-sm border border-white/10 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-sm bg-red-950/60 text-red-500 font-mono font-bold flex items-center justify-center border border-red-900/40 text-xs">
                      #{m.number}
                    </span>
                    <div>
                      <div className="font-bold text-zinc-200 uppercase tracking-wider">
                        {m.roosterRed} vs {m.roosterBlue}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {m.ownerRed} • {m.ownerBlue}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded-sm border border-white/10">
                      {m.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
