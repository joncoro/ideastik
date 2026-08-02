// Formatos de contenido y redes sociales, con sus iconos (Feather, para SafeIcon).
// Se usan en la parrilla (para reconocer de un vistazo) y en el editor (toggles).

export const FORMATOS = [
  { id: 'Reel', label: 'Reel', icon: 'Video', hint: 'Video corto' },
  { id: 'Carrusel', label: 'Carrusel', icon: 'Layers', hint: 'Varias láminas' },
  { id: 'Historia', label: 'Historia', icon: 'Circle', hint: 'Story de 24h' },
  { id: 'Imagen', label: 'Imagen', icon: 'Image', hint: 'Una foto o post' },
];

export const CANALES = [
  { id: 'Instagram', label: 'Instagram', icon: 'Instagram' },
  { id: 'Facebook', label: 'Facebook', icon: 'Facebook' },
  { id: 'TikTok', label: 'TikTok', icon: 'Music' },
];

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Devuelve el nombre del icono Feather para un formato (texto libre), con respaldo.
export const iconoFormato = (formato) => {
  const n = norm(formato);
  if (n.includes('reel') || n.includes('video')) return 'Video';
  if (n.includes('carrusel') || n.includes('carousel')) return 'Layers';
  if (n.includes('historia') || n.includes('story')) return 'Circle';
  if (n.includes('imagen') || n.includes('foto') || n.includes('post')) return 'Image';
  return 'FileText';
};

// Devuelve el nombre del icono Feather para una red social (texto libre), con respaldo.
export const iconoCanal = (canal) => {
  const n = norm(canal);
  if (n.includes('instagram') || n === 'ig') return 'Instagram';
  if (n.includes('facebook') || n === 'fb') return 'Facebook';
  if (n.includes('tiktok') || n.includes('tik tok')) return 'Music';
  if (n.includes('whatsapp')) return 'MessageCircle';
  return 'Send';
};

// Etiqueta legible de formato normalizada a nuestro vocabulario (para mostrar).
export const labelFormato = (formato) => {
  const f = FORMATOS.find(x => norm(x.id) === norm(formato));
  return f ? f.label : (formato || 'Publicación');
};
