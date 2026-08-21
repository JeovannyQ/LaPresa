import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BroadcastPanel } from './components/BroadcastPanel';
import { Portada } from './pages/Portada';
import { FichaTecnica } from './pages/FichaTecnica';

export type Ruta = 'portada' | 'ficha';

const RUTAS: Record<Ruta, string> = {
  portada: '/',
  ficha: '/ficha',
};

const rutaDeUrl = (): Ruta =>
  window.location.pathname.replace(/\/+$/, '') === '/ficha' ? 'ficha' : 'portada';

/**
 * Enrutado a mano, sin react-router.
 *
 * Son dos pantallas y ninguna lleva parámetros; meter una dependencia de
 * enrutado para esto pesaría más que el problema que resuelve. El servidor ya
 * devuelve index.html para cualquier ruta (el catch-all de server.ts), así que
 * entrar directo a /ficha o recargar ahí funciona igual.
 */
export default function App() {
  const [ruta, setRuta] = useState<Ruta>(rutaDeUrl);
  const [panelAbierto, setPanelAbierto] = useState(false);

  // El botón "atrás" del navegador tiene que funcionar: en móvil es como la
  // gente vuelve, y sin esto la URL cambiaba pero la pantalla se quedaba igual.
  useEffect(() => {
    const alVolver = () => setRuta(rutaDeUrl());
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const navegar = useCallback((destino: Ruta) => {
    if (window.location.pathname !== RUTAS[destino]) {
      window.history.pushState({}, '', RUTAS[destino]);
    }
    setRuta(destino);
    // Sin esto se llega a la pantalla nueva a media altura, donde se hubiera
    // quedado el scroll de la anterior.
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar
        rutaActiva={ruta}
        onNavegar={navegar}
        onBroadcastClick={() => setPanelAbierto(true)}
      />

      {ruta === 'ficha' ? (
        <FichaTecnica onIrAlVivo={() => navegar('portada')} />
      ) : (
        <Portada onVerFicha={() => navegar('ficha')} />
      )}

      <Footer />

      <BroadcastPanel isOpen={panelAbierto} onClose={() => setPanelAbierto(false)} />
    </div>
  );
}
