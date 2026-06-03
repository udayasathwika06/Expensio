import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        delete api.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });
      if (error) throw error;
      toast.success('Registration successful! Please check your email to verify your account if required.');
      return true;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged out successfully');
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // It redirects to google so we don't need to return success
    } catch (error) {
      toast.error(error.message || 'Google login failed');
    }
  };

  const value = {
    user,
    session,
    login,
    register,
    loginWithGoogle,
    logout,
    loading,
    isAuthenticated: !!session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
