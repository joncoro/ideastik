/* 
  Este servicio centraliza las llamadas a la IA. 
  En producción, estas funciones llaman a Supabase Edge Functions 
  que a su vez conectan con Anthropic Claude-3-5-Sonnet.
*/

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const aiService = {
  // Generaciones JSON (Respuesta completa)
  async generarPropuestaValor(negocio) {
    await delay(1500);
    return {
      vp: `${negocio.nombre} no solo vende ${negocio.sector?.toLowerCase()}, ofrece una solución de confianza en ${negocio.ciudad} para quienes valoran ${negocio.diferente}.`,
      narrativa: `En un mercado saturado de opciones genéricas, ${negocio.nombre} nace para servir a la comunidad de ${negocio.ciudad}. Entendemos que ${negocio.que_hace?.toLowerCase()} requiere más que solo técnica; requiere el compromiso de ser ${negocio.diferente}.`,
      audiencia: `Clientes en ${negocio.ciudad} que buscan calidad superior y una conexión humana genuina en el sector de ${negocio.sector?.toLowerCase()}.`,
      storytelling: `La historia de ${negocio.nombre} es la historia de buscar la excelencia en ${negocio.ciudad}. Cada interacción está diseñada para demostrar que ${negocio.diferente} es nuestra brújula.`
    };
  },

  async sugerirPilares(negocio) {
    await delay(1200);
    return [
      { tipo: 'autoridad', nombre: 'Expertos en ' + negocio.sector, descripcion: 'Demostrar conocimiento profundo y trayectoria.' },
      { tipo: 'conexion', nombre: 'Orgullo de ' + negocio.ciudad, descripcion: 'Historias locales y conexión con la comunidad.' },
      { tipo: 'venta', nombre: 'Nuestra Solución', descripcion: 'Cómo resolvemos problemas específicos con ' + negocio.diferente },
      { tipo: 'educacion', nombre: 'Tips de Valor', descripcion: 'Enseñar a la audiencia a tomar mejores decisiones.' }
    ];
  },

  async generarIdeas(pilares) {
    await delay(1500);
    const ideas = {};
    pilares.forEach(p => {
      ideas[p.nombre] = [
        { gancho: `3 errores comunes en ${p.nombre}`, desc: "Un post educativo para ganar autoridad.", formato: "Reel" },
        { gancho: `Cómo ${p.nombre} cambió mi día`, desc: "Testimonio o historia de éxito.", formato: "Imagen" }
      ];
    });
    return { ideas };
  },

  // Generaciones de Texto/Chat (Streaming en entorno real)
  async armarPublicacion(post, negocio) {
    // En Edge Functions esto usa stream: true con Anthropic
    await delay(1800);
    return {
      copy: `✨ ¿Buscas algo realmente diferente en ${negocio.ciudad}?\n\nEn ${negocio.nombre}, sabemos que la clave de ${post.pilar.toLowerCase()} no es solo el servicio, sino cómo te hace sentir.\n\nHoy te contamos cómo aplicamos nuestro diferencial: ${negocio.diferente}.\n\n¿Ya conocías este enfoque? 👇`,
      cta: `Escríbenos un mensaje directo para una asesoría personalizada.`,
      hashtags: ['estrategia', negocio.ciudad.toLowerCase(), 'emprendimiento', 'valorreal']
    };
  }
};