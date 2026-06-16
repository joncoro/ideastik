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
  }
};