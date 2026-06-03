import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiSearch, FiChevronDown, FiArrowLeft, FiX, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Food', 'Shopping', 'Travel', 'Medical', 'Entertainment', 'Bills', 'Groceries', 'Others'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchExpenses(); }, [selectedCategory]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url = selectedCategory ? `/expenses/?category=${selectedCategory}` : '/expenses/';
      const res = await api.get(url);
      setExpenses(res.data.expenses || []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;
    try {
      await api.put(`/expenses/${editingExpense.id}`, editingExpense);
      toast.success('Expense updated');
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? editingExpense : e));
      setEditingExpense(null);
    } catch {
      toast.error('Failed to update expense');
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const filtered = expenses.filter(e =>
    (e.merchant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="navbar">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost px-2 py-2">
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="font-display font-semibold text-white text-base leading-tight">Expense History</h1>
            <p className="text-xs text-gray-500">{expenses.length} total transactions</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Search by merchant or category…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input input-icon"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input appearance-none pr-8 min-w-[160px] cursor-pointer"
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-600">No expenses found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="table-th">Merchant</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Category</th>
                    <th className="table-th w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(expense => (
                    <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors group">
                      {editingExpense?.id === expense.id ? (
                        <>
                          <td className="table-td">
                            <input
                              type="text"
                              value={editingExpense.merchant}
                              onChange={e => setEditingExpense({ ...editingExpense, merchant: e.target.value })}
                              className="input py-1.5 text-sm"
                            />
                          </td>
                          <td className="table-td">
                            <input
                              type="number"
                              value={editingExpense.amount}
                              onChange={e => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
                              className="input py-1.5 text-sm w-28"
                            />
                          </td>
                          <td className="table-td">
                            <input
                              type="date"
                              value={editingExpense.date?.split('T')[0]}
                              onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })}
                              className="input py-1.5 text-sm"
                            />
                          </td>
                          <td className="table-td">
                            <select
                              value={editingExpense.category}
                              onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                              className="input py-1.5 text-sm bg-surface"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="table-td">
                            <div className="flex items-center gap-1">
                              <button onClick={handleUpdate} className="btn-ghost px-2 py-1.5 text-emerald-400 hover:text-emerald-300">
                                <FiCheck />
                              </button>
                              <button onClick={() => setEditingExpense(null)} className="btn-ghost px-2 py-1.5 text-gray-500">
                                <FiX />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="table-td font-medium">{expense.merchant || '—'}</td>
                          <td className="table-td font-semibold text-white">{fmt(expense.amount)}</td>
                          <td className="table-td text-gray-400">
                            {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="table-td">
                            <span className="badge-primary">{expense.category}</span>
                          </td>
                          <td className="table-td">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingExpense(expense)} className="btn-ghost px-2 py-1.5 text-gray-400 hover:text-blue-400">
                                <FiEdit2 className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                disabled={deletingId === expense.id}
                                className="btn-ghost px-2 py-1.5 text-gray-400 hover:text-red-400 disabled:opacity-40"
                              >
                                {deletingId === expense.id
                                  ? <span className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block" />
                                  : <FiTrash2 className="text-sm" />
                                }
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;
