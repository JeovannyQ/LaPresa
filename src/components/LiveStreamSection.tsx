import React, { useState } from 'react';
import { Play, Radio, Copy, Check, ExternalLink, Sparkles, Share2 } from 'lucide-react';

interface LiveStreamSectionProps {
  currentFightNumber?: number;
}

export const LiveStreamSection: React.FC<LiveStreamSectionProps> = ({ currentFightNumber = 14 }) => {
  const [activeChannel] = useState<'main' | 'sec'>('main');
  const [copied, setCopied] = useState(false);
  const [playerMode] = useState<'embed' | 'direct'>('embed');
  const activeChannelHandle = 'galleralapresa';

  const mainUrl = `https://twitch.tv/${activeChannelHandle}`;
  const secUrl = `https://twitch.tv/${activeChannelHandle}_ruedo2`;

  const currentTwitchUrl = activeChannel === 'main' ? mainUrl : secUrl;
  const currentChannelName = activeChannel === 'main' ? activeChannelHandle : `${activeChannelHandle}_ruedo2`;

  // Host domain for Twitch Embed parent parameter
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTwitchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };



  return (
    <section id="live-stream" className="py-16 bg-white text-zinc-900 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Transmisión Oficial Twitch</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-black uppercase italic tracking-tighter text-zinc-900">
              RUEDO EN <span className="text-red-600">DIRECTO</span>
            </h2>
            <p className="text-zinc-600 font-editorial italic text-base mt-1">
              Sigue cada jugada desde la Presa de Tavera en tiempo real con alta definición.
            </p>
          </div>

          {/* Live indicator badge */}
          <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-sm border border-zinc-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">Canal Principal Twitch</span>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Video Screen */}
          <div className="lg:col-span-8 space-y-4">
            
            <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-zinc-300 shadow-xl group">
              
              {playerMode === 'embed' ? (
                <iframe
                  src={`https://player.twitch.tv/?channel=${currentChannelName}&parent=${currentHostname}&parent=localhost&parent=127.0.0.1&autoplay=true&muted=false`}
                  title="Twitch Live Stream Gallera La Presa"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                /* Fallback preview / Direct Launcher Card */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 relative text-white">
                  <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-600/50 flex items-center justify-center mb-4 shadow-lg">
                    <Play className="w-8 h-8 text-red-500 fill-current ml-1" />
                  </div>
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">
                    CANAL TWITCH: <span className="text-red-500 font-mono font-bold">@{currentChannelName}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-editorial italic max-w-md mt-2 mb-6">
                    Haz clic a continuación para ver la transmisión en vivo directamente en la aplicación de Twitch.
                  </p>
                  <a
                    href={currentTwitchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-sm transition-all flex items-center gap-3 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Abrir Transmisión en Twitch</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </a>
                </div>
              )}

              {/* Status Overlay Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-sm border border-white/20 text-[10px] font-bold tracking-widest uppercase text-white">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span className="text-red-500 font-black">EN VIVO</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-200">Pelea #{currentFightNumber}</span>
              </div>

            </div>

            {/* Quick Stream Controls & Sharing */}
            <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-600 font-bold uppercase tracking-wider text-[10px]">Canal Activo:</span>
                <span className="bg-white text-red-600 border border-zinc-200 px-3 py-1 rounded-sm font-mono font-bold text-xs shadow-sm">
                  twitch.tv/{currentChannelName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold uppercase tracking-wider rounded-sm border border-zinc-300 shadow-sm flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-red-600" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Link'}</span>
                </button>

                <a
                  href={currentTwitchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Twitch</span>
                </a>
              </div>

            </div>

          </div>

          {/* Direct Stream Links & Channel Config Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Links Card */}
            <div className="bg-zinc-50 p-6 rounded-sm border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-display font-black uppercase italic tracking-tighter text-zinc-900 flex items-center gap-2 border-b border-zinc-200 pb-3">
                <Sparkles className="w-4 h-4 text-red-600" />
                Enlaces Directos de Transmisión
              </h3>
              
              <p className="text-xs text-zinc-600 font-editorial italic leading-relaxed">
                Usa estos enlaces directos para transmitir en tu Smart TV, celular o compartir por WhatsApp con otros fanáticos:
              </p>

              <div className="space-y-3 pt-1">
                {/* Channel 1 Direct */}
                <a
                  href={mainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-white hover:bg-zinc-100 rounded-sm border border-zinc-200 shadow-sm flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center text-red-600 group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Ruedo Principal (Cámara 1)</div>
                      <div className="text-[10px] text-zinc-500 font-mono">twitch.tv/{activeChannelHandle}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-600 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Channel 2 Direct */}
                <a
                  href={secUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-white hover:bg-zinc-100 rounded-sm border border-zinc-200 shadow-sm flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center text-red-600 group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Ruedo Secundario (Cámara 2)</div>
                      <div className="text-[10px] text-zinc-500 font-mono">twitch.tv/{activeChannelHandle}_ruedo2</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-600 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* Share via WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔴 ¡Mira la pelea en vivo en Gallera La Presa! Entra a la transmisión por Twitch aquí: ${mainUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-[0.15em] text-xs rounded-sm flex items-center justify-center gap-2 shadow transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir por WhatsApp</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
