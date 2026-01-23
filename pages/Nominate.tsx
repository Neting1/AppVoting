import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, User } from '../types';
import { ArrowLeft, Send } from 'lucide-react';

export const Nominate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCycle, setActiveCycle] = useState<Cycle | undefined>();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedNominee, setSelectedNominee] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cycle = await dbService.getActiveCycle();
        setActiveCycle(cycle);

        const allEmployees = await dbService.getEmployees();
        // Filter out current user from potential nominees
        setEmployees(allEmployees.filter(e => e.id !== user?.id));

        // Check if already nominated
        if (user && cycle) {
          const existing = await dbService.getUserNomination(user.id, cycle.id);
          if (existing) {
            setSuccess(true);
          }
        }
      } catch (error) {
        console.error("Failed to load nomination data", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle || !user) return;
    
    try {
      await dbService.addNomination(user.id, selectedNominee, activeCycle.id, reason);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!activeCycle || activeCycle.status !== CycleStatus.NOMINATION) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Nominations Closed</h2>
        <p className="text-gray-500 mt-2">The nomination phase is currently inactive.</p>
        <button onClick={() => navigate('/')} className="mt-6 text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Send className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Nomination Submitted!</h2>
        <p className="text-gray-600 mt-3 text-lg">Thank you for recognizing your colleague's hard work.</p>
        <p className="text-gray-400 text-sm mt-8 animate-pulse">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900">Nominate a Colleague</h2>
          <p className="text-gray-500 mt-2">Select an employee and share why they deserve to be Employee of the Month.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Nominee</label>
            <div className="relative">
              <select
                required
                value={selectedNominee}
                onChange={(e) => setSelectedNominee(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 appearance-none transition-all cursor-pointer"
              >
                <option value="">-- Choose an employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.department}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Nomination</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all resize-none"
              placeholder="Describe their achievements, attitude, or specific contributions that make them stand out..."
            ></textarea>
            <p className="mt-2 text-xs text-gray-500 flex items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
              Your nomination is anonymous to the nominee, but visible to admins.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
              {error}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm hover:shadow active:scale-[0.99]"
            >
              Submit Nomination
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};