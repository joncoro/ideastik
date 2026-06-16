import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabase/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId) => {
    try {
      // 1. Cargar Perfil
      const { data: prof, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (prof) setProfile(prof);

      // 2. Cargar Negocios
      const { data: bizs, error: bError } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      const businessList = bizs || [];
      setAllBusinesses(businessList);

      if (businessList.length > 0) {
        const storedBizId = localStorage.getItem('ideastik_current_biz_id');
        const activeBiz = businessList.find(b => b.id === storedBizId) || businessList[0];
        setCurrentBusiness(activeBiz);
        localStorage.setItem('ideastik_current_biz_id', activeBiz.id);
      } else {
        setCurrentBusiness(null);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (!user || user.id !== session.user.id) {
          setUser(session.user);
          loadUserData(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setCurrentBusiness(null);
        setAllBusinesses([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { full_name: name } } 
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ideastik_current_biz_id');
  };

  const switchBusiness = (biz) => {
    setCurrentBusiness(biz);
    // Mantener allBusinesses en sync (incluye negocios recién creados en el wizard)
    setAllBusinesses(prev => prev.some(b => b.id === biz.id) ? prev.map(b => b.id === biz.id ? biz : b) : [biz, ...prev]);
    localStorage.setItem('ideastik_current_biz_id', biz.id);
  };

  const refreshProfile = async () => {
    if (!user) return null;
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (prof) setProfile(prof);
    return prof;
  };

  const refreshBusiness = async () => {
    if (user) {
      const { data: bizs } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });
      
      setAllBusinesses(bizs || []);
      if (currentBusiness) {
        const b = (bizs || []).find(x => x.id === currentBusiness.id);
        if (b) setCurrentBusiness(b);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, currentBusiness, allBusinesses, 
      setCurrentBusiness, switchBusiness, login, signUp, logout,
      loading, refreshBusiness, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);