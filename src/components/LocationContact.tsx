import React from 'react';
import { MapPin, Navigation, MessageSquare, ExternalLink } from 'lucide-react';

export const LocationContact: React.FC = () => {
  const addressText = "Carretera principal de la Presa de Tavera";
  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=Presa+de+Tavera+Gallera";
  const whatsappNumber = "18095557737";
  const whatsappMessage = encodeURIComponent("Hola Gallera La Presa, quisiera información sobre las próximas jugadas y reservación de mesas.");

  return (
    <section id="location" className="py-20 bg-white text-zinc-900 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Location Info & Address */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="inline-flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Ubicación y Contacto</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-zinc-900 leading-none">
              ¿CÓMO LLEGAR A <span className="text-red-600">LA PRESA</span>?
            </h2>

            <div className="p-6 sm:p-8 bg-zinc-50 rounded-sm border border-zinc-200 space-y-4 shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-600 tracking-[0.3em]">DIRECCIÓN OFICIAL</span>
                <p className="text-xl sm:text-3xl font-display font-black uppercase italic tracking-tighter text-zinc-900 mt-2">
                  {addressText}
                </p>
                <p className="text-xs text-zinc-600 font-editorial italic mt-1">
                  Presa de Tavera, Santiago / La Vega, República Dominicana.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex flex-wrap gap-4">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-sm shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-sm shadow-sm flex items-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Escribir por WhatsApp</span>
                </a>
              </div>
            </div>



          </div>

          {/* Map View Box */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-50 p-4 rounded-sm border border-zinc-200 shadow-sm space-y-4">
              <div className="relative aspect-square sm:aspect-video lg:aspect-square rounded-sm overflow-hidden bg-white border border-zinc-200 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                
                <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4 shadow-sm">
                  <MapPin className="w-8 h-8 text-red-600 animate-bounce" />
                </div>

                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-zinc-900">
                  UBICACIÓN PRESA DE TAVERA
                </h3>

                <p className="text-xs text-zinc-600 font-editorial italic max-w-xs mt-2 mb-6 leading-relaxed">
                  Carretera principal de la Presa de Tavera. Fácil acceso desde Santiago, La Vega, Moca y Jarabacoa.
                </p>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-sm shadow transition-colors flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Ver en Mapa Interactivo</span>
                </a>

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
