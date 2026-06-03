import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiTrendingUp } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await register(name, email, password);
    setLoading(false);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-surface border-r border-white/[0.07] p-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Expensio" className="w-10 h-10 rounded-xl object-cover shadow-[0_0_15px_rgba(109,40,217,0.5)]" />
          <span className="font-display font-semibold text-white text-lg tracking-wide">Expensio</span>
        </div>
        <div>
          <p className="text-3xl font-display font-bold text-white leading-snug mb-3">
            Start tracking<br />smarter today.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Join thousands of users who manage their finances with ease using AI-powered tracking.
          </p>
        </div>
        <div className="space-y-3">
          {['Free to get started', 'AI-powered insights', 'Secure & private'].map(f => (
            <div key={f} className="flex items-center gap-2.5 text-sm text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo.png" alt="Expensio" className="w-8 h-8 rounded-lg object-cover shadow-[0_0_10px_rgba(109,40,217,0.4)]" />
            <span className="font-display font-semibold text-white tracking-wide">Expensio</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-white mb-1">Create account</h1>
            <p className="text-sm text-gray-500">Get started — it only takes a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Full name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input input-icon"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Email address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input input-icon"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input input-icon pr-10"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Or</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full mt-6 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm font-semibold text-white"
          >
            <FcGoogle className="text-xl" />
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-purple-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
