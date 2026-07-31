import supabase from '../supabase/supabase';

export const db = {
  // Businesses
  async createBusiness(userId, data) {
    const { data: biz, error } = await supabase
      .from('businesses')
      .insert([{ user_id: userId, ...data }])
      .select()
      .single();
    if (error) throw error;
    return biz;
  },

  async updateBusiness(id, updates) {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBusiness(id) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Elimina un negocio. La BD borra en cascada sus grids, posts, mensajes,
  // notificaciones, recordatorios e historias (todas las FK son ON DELETE CASCADE).
  async deleteBusiness(id) {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Grids
  async getGrid(businessId, mes, anio) {
    const { data, error } = await supabase
      .from('grids')
      .select('*')
      .eq('business_id', businessId)
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle();
    return data;
  },

  async createGrid(businessId, mes, anio) {
    const { data, error } = await supabase
      .from('grids')
      .insert([{ business_id: businessId, mes, anio }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Posts
  async createPosts(posts) {
    const { data, error } = await supabase
      .from('posts')
      .insert(posts)
      .select();
    if (error) throw error;
    return data;
  },

  async getPostsByGrid(gridId) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('grid_id', gridId)
      .order('fecha', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getPost(id) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Marca (o desmarca) una publicación como ya publicada. Es el gesto de hábito
  // que alimenta el contador/racha del calendario.
  async marcarPublicado(id, publicado = true) {
    return this.updatePost(id, { status: publicado ? 'PUBLISHED' : 'READY' });
  },

  // Fecha + estado de TODAS las publicaciones del negocio (a través de sus
  // parrillas), para calcular el contador y la racha mes a mes. Ligero: solo
  // trae dos columnas.
  async getPublicacionesStats(businessId) {
    const { data: grids, error: ge } = await supabase
      .from('grids')
      .select('id')
      .eq('business_id', businessId);
    if (ge) throw ge;
    const ids = (grids || []).map(g => g.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('fecha, status')
      .in('grid_id', ids);
    if (error) throw error;
    return data || [];
  },

  async updatePost(id, updates) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Cuenta de parrillas/meses de un negocio (para límites de plan)
  async countGrids(businessId) {
    const { count, error } = await supabase
      .from('grids')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    if (error) throw error;
    return count || 0;
  },

  // Notificaciones in-app
  async createNotification(n) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([n])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Banco de historias / material real de la marca (memoria del negocio)
  async createHistoria(businessId, texto, origen = 'editor', tipo = null) {
    const { data, error } = await supabase
      .from('historias')
      .insert([{ business_id: businessId, texto, origen, tipo }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getHistorias(businessId, limit = 20) {
    const { data, error } = await supabase
      .from('historias')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // Opiniones del usuario. Dejar al menos una opinión es requisito para canjear
  // un código de regalo (ver redeemPromoCode). El admin ve los conteos en su panel.
  async enviarOpinion(userId, { message, rating = null, category = 'general', page = null, businessId = null }) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ user_id: userId, message, rating, category, page, business_id: businessId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async miOpinionCount(userId) {
    const { count, error } = await supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    return count || 0;
  },

  // Canjear un código de regalo. El servidor exige haber dejado ≥1 opinión y
  // suma los créditos de forma atómica. Devuelve { credits_added, new_balance }.
  async redeemPromoCode(code) {
    const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code });
    if (error) throw new Error(error.message || 'No se pudo canjear el código.');
    return data;
  },

  // --- Admin: gestión de códigos de regalo (todas validan is_admin en el servidor) ---
  async adminCreatePromoCodes({ credits, count = 1, note = null, expiresAt = null, maxRedemptions = 1 }) {
    const { data, error } = await supabase.rpc('admin_create_promo_codes', {
      p_credits: credits, p_count: count, p_note: note, p_expires_at: expiresAt, p_max_redemptions: maxRedemptions,
    });
    if (error) throw new Error(error.message || 'No se pudieron crear los códigos.');
    return data;
  },

  async adminListPromoCodes() {
    const { data, error } = await supabase.rpc('admin_list_promo_codes');
    if (error) throw new Error(error.message || 'No se pudieron cargar los códigos.');
    return data || [];
  },

  async adminSetPromoActive(codeId, active) {
    const { data, error } = await supabase.rpc('admin_set_promo_active', { p_code_id: codeId, p_active: active });
    if (error) throw new Error(error.message || 'No se pudo actualizar el código.');
    return data;
  }
};