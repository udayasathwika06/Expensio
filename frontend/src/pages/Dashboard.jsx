import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FiTrendingUp, FiDollarSign, FiShoppingBag, FiCalendar,
  FiCreditCard, FiLogOut, FiUploadCloud, FiList, FiZap
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#84cc16'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState({});
  const [insights, setInsights] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, trendsRes, distributionRes, insightsRes, expensesRes] = await Promise.all([
        api.get('/expenses/summary/monthly'),
        api.get('/expenses/trends?months=6'),
        api.get('/expenses/distribution?days=30'),
        api.get('/expenses/insights'),
        api.get('/expenses/?limit=10'),
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data.trends || []);
      setDistribution(distributionRes.data.distribution || {});
      setInsights(insightsRes.data.insights || []);
      setRecentExpenses((expensesRes.data.expenses || []).slice(0, 5));
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const pieData = Object.entries(distribution).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a1a28] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-gray-400 mb-0.5">{label || payload[0].name}</p>
        <p className="text-white font-semibold">{fmt(payload[0].value)}</p>
      </div>
    );
  };

  const stats = [
    { label: 'Monthly Spend', value: fmt(summary?.total), icon: <FiDollarSign />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Transactions', value: summary?.expense_count ?? '—', icon: <FiCreditCard />, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Avg Daily', value: fmt(summary?.average_daily), icon: <FiCalendar />, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Categories', value: Object.keys(distribution).length, icon: <FiShoppingBag />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Expensio" className="w-8 h-8 rounded-lg object-cover shadow-[0_0_10px_rgba(109,40,217,0.4)]" />
            <span className="font-display font-semibold text-white tracking-wide">Expensio</span>
            <span className="hidden sm:block text-gray-600 text-sm ml-1">/ Dashboard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/upload')} className="btn-primary px-3 py-2 text-sm">
              <FiUploadCloud className="text-base" />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button onClick={() => navigate('/expenses')} className="btn-secondary px-3 py-2 text-sm">
              <FiList className="text-base" />
              <span className="hidden sm:inline">Expenses</span>
            </button>
            <button onClick={logout} className="btn-ghost px-3 py-2 text-sm">
              <FiLogOut className="text-base" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-display font-semibold text-white">
            Good day, <span className="text-primary">{user?.user_metadata?.full_name || user?.user_metadata?.name || 'there'}</span> 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your financial overview for this month.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center text-base`}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-white tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Bar chart - takes more space */}
          <div className="card p-5 lg:col-span-3">
            <p className="text-sm font-semibold text-white mb-4">Monthly Spending Trend</p>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total" fill="#6d28d9" radius={[4, 4, 0, 0]} maxBarSize={40} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No data yet</div>
            )}
          </div>

          {/* Donut chart */}
          <div className="card p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-white mb-4">By Category</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {pieData.slice(0, 4).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-400">{d.name}</span>
                      </div>
                      <span className="text-gray-300 font-medium">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">No data yet</div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Recent expenses */}
          <div className="card lg:col-span-3">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <p className="text-sm font-semibold text-white">Recent Transactions</p>
              <button onClick={() => navigate('/expenses')} className="text-xs text-primary hover:text-purple-400 transition-colors font-medium">
                View all →
              </button>
            </div>
            {recentExpenses.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {recentExpenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">
                        <FiShoppingBag />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200 leading-tight">{e.merchant || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{fmt(e.amount)}</p>
                      <span className="badge-primary text-[10px] mt-0.5">{e.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-600">No transactions yet</div>
            )}
          </div>

          {/* AI Insights */}
          <div className="card lg:col-span-2">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
              <FiZap className="text-amber-400 text-sm" />
              <p className="text-sm font-semibold text-white">AI Insights</p>
            </div>
            {insights.length > 0 ? (
              <div className="p-4 space-y-2.5">
                {insights.map((ins, i) => (
                  <div key={i} className="text-xs text-gray-400 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 leading-relaxed">
                    {ins}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-600 px-5">
                Add more expenses to unlock AI insights
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
