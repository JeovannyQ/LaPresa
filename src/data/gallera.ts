/**
 * Los datos fijos de la gallera, en un solo sitio.
 *
 * Están aquí y no repartidos por los componentes porque son lo que el cliente
 * pide cambiar de vez en cuando (un horario, el teléfono), y buscarlos dentro
 * del JSX de tres pantallas distintas es cómo se acaba con dos horarios que no
 * coinciden entre sí.
 */
export const GALLERA = {
  nombre: 'La Presa',
  nombreCompleto: 'Club Gallístico La Presa',
  ciudad: 'Santiago, República Dominicana',

  diasActividad: 'Miércoles • Domingo',
  recepcion: '5:30 - 7:00 PM',
  inicio: '7:30 PM',

  direccion: 'Carretera principal de la Presa de Tavera',
  direccionDetalle: 'Presa de Tavera, Santiago / La Vega, República Dominicana.',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Presa+de+Tavera+Gallera',

  whatsappNumero: '18095557737',
  whatsappMensaje: 'Hola Gallera La Presa, quisiera información sobre las próximas jugadas.',
} as const;

export const whatsappUrl = (): string =>
  `https://api.whatsapp.com/send?phone=${GALLERA.whatsappNumero}&text=${encodeURIComponent(GALLERA.whatsappMensaje)}`;
