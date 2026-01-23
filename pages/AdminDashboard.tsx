import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, CycleStats, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, Play, StopCircle, Archive, Pencil, Power, X, UserPlus, Calendar, Award, MessageSquare, CheckCircle, Vote, Trophy, Lock } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminDashboard: React.FC = () => {
  const [activeCycle, setActiveCycle] = useState<Cycle | undefined>();
  const [stats, setStats] = useState<CycleStats[]>([]);
  const [winner, setWinner] = useState<User | null>(null);
  
  // Cycle Creation State
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);
  const [createCycleForm, setCreateCycleForm] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [createCycleError, setCreateCycleError] = useState('');

  // Employee Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Profile View State
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  // Add Employee Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    role: UserRole.EMPLOYEE,
    password: ''
  });
  const [addUserError, setAddUserError] = useState('');

  const refreshData = async () => {
    try {
      const cycle = await dbService.getActiveCycle();
      setActiveCycle(cycle);
      if (cycle) {
        const stats = await dbService.getCycleStats(cycle.id);
        setStats(stats);
        if (cycle.winnerId) {
          const winnerUser = await dbService.getUserById(cycle.winnerId);
          setWinner(winnerUser || null);
        } else {
          setWinner(null);
        }
      }
      const allUsers = await dbService.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load admin data", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenCreateCycle = () => {
    const now = new Date();
    setCreateCycleForm({ month: now.getMonth(), year: now.getFullYear() });
    setCreateCycleError('');
    setIsCreateCycleModalOpen(true);
  };

  const handleCreateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCycleError('');

    const now = new Date();
    const selectedDate = new Date(createCycleForm.year, createCycleForm.month);
    const currentDate = new Date(now.getFullYear(), now.getMonth());

    if (selectedDate > currentDate) {
      setCreateCycleError("Cannot start a cycle for a future month.");
      return;
    }

    await dbService.createCycle(createCycleForm.month, createCycleForm.year);
    setIsCreateCycleModalOpen(false);
    refreshData();
  };

  const updateStatus = async (status: CycleStatus) => {
    if (activeCycle) {
      await dbService.updateCycleStatus(activeCycle.id, status);
      refreshData();
    }
  };

  const handleDeclareWinner = async () => {
    if (!activeCycle || stats.length === 0) return;
    
    // Assumes stats are sorted by vote count desc
    const leader = stats[0];
    if (leader.voteCount > 0) {
      await dbService.setCycleWinner(activeCycle.id, leader.nomineeId);
      await dbService.updateCycleStatus(activeCycle.id, CycleStatus.CLOSED);
      refreshData();
    }
  };

  const handleExport = async () => {
    if (!activeCycle) return;
    
    // Convert stats to CSV
    const headers = ['Nominee Name', 'Department', 'Nominations', 'Votes'];
    const users = await dbService.getUsers();
    
    const rows = stats.map(s => {
      const u = users.find(user => user.id === s.nomineeId);
      return [
        s.nomineeName,
        u?.department || 'N/A',
        s.nominationCount,
        s.voteCount
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `results_${MONTHS[activeCycle.month]}_${activeCycle.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // User Management Functions
  const handleEditClick = (user: User) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleViewProfile = async (user: User) => {
    setViewingUser(user);
    const history = await dbService.getEmployeeHistory(user.id);
    setUserHistory(history);
  };

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await dbService.updateUser(editingUser);
      setIsEditModalOpen(false);
      setEditingUser(null);
      refreshData();
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await dbService.updateUser({ ...user, status: newStatus });
    refreshData();
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    try {
      await dbService.addUser({
        name: newUser.name,
        email: newUser.email,
        department: newUser.department,
        role: newUser.role,
        password: newUser.password || 'password123' // Fallback default
      });
      setIsAddUserModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        department: '',
        role: UserRole.EMPLOYEE,
        password: ''
      });
      refreshData();
    } catch (err: any) {
      setAddUserError(err.message);
    }
  };

  // Helper to render winner card content
  const renderWinnerSection = () => {
    if (winner) {
      return (
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            {winner.avatar ? (
               <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
            ) : (
               <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-3xl font-bold border-4 border-white shadow-lg">
                 {winner.name.charAt(0)}
               </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white p-2 rounded-full shadow-md">
              <Trophy className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-3xl font-bold text-white mb-1">{winner.name}</h3>
            <p className="text-indigo-100 text-lg">{winner.department}</p>
            <div className="mt-4 inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium border border-white/30">
              <CheckCircle className="w-4 h-4 mr-2" />
              Official Employee of the Month
            </div>
          </div>
        </div>
      );
    }

    if (stats.length > 0) {
      const leader = stats[0];
      return (
        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl font-bold backdrop-blur-sm">
                #1
             </div>
             <div>
               <h3 className="text-xl font-bold text-white">Current Leader: {leader.nomineeName}</h3>
               <p className="text-indigo-100">{leader.voteCount} Votes ({Math.round((leader.voteCount / (stats.reduce((acc, c) => acc + c.voteCount, 0) || 1)) * 100)}%)</p>
             </div>
          </div>
          
          <button 
            onClick={handleDeclareWinner}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all active:scale-95 flex items-center"
          >
            <Trophy className="w-5 h-5 mr-2" />
            Declare Winner & Close Cycle
          </button>
        </div>
      );
    }

    return (
      <div className="text-center py-4 w-full">
         <p className="text-indigo-100 text-lg">No votes recorded yet. Wait for voting to begin to see leaders.</p>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage voting cycles, view results, and manage employees.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenCreateCycle}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Cycle
          </button>
        </div>
      </div>

      {/* Cycle Management Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Cycle Status</h2>
        
        {activeCycle ? (
          <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold text-gray-900 mr-3">
                {MONTHS[activeCycle.month]} {activeCycle.year}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${activeCycle.status === CycleStatus.NOMINATION ? 'bg-blue-100 text-blue-800' : 
                  activeCycle.status === CycleStatus.VOTING ? 'bg-green-100 text-green-800' : 
                  'bg-gray-100 text-gray-800'}`}>
                {activeCycle.status}
              </span>
            </div>
            
            <div className="flex gap-3">
              {activeCycle.status === CycleStatus.NOMINATION && (
                <button 
                  onClick={() => updateStatus(CycleStatus.VOTING)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Voting
                </button>
              )}
              {activeCycle.status === CycleStatus.VOTING && (
                <button 
                  onClick={() => updateStatus(CycleStatus.CLOSED)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Close Cycle
                </button>
              )}
              {activeCycle.status === CycleStatus.CLOSED && (
                <button disabled className="flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium border border-gray-200">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived
                </button>
              )}
            </div>
          </div>
        ) : (
           <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
             No active cycle found. Create one to begin.
           </div>
        )}
      </div>

      {/* Winner Podium / Leader Section */}
      {activeCycle && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 p-20 bg-indigo-900 opacity-10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="p-8 relative z-10">
             <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold uppercase tracking-wider mb-4">
               <Award className="w-4 h-4" />
               {winner ? 'Winner Circle' : 'Projected Winner'}
             </div>
             {renderWinnerSection()}
          </div>
        </div>
      )}

      {/* Results Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Real-time Results</h2>
            <button 
              onClick={handleExport}
              disabled={stats.length === 0}
              className="flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>
          </div>
          
          {stats.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="nomineeName" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="nominationCount" name="Nominations" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="voteCount" name="Votes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 border border-dashed border-gray-200">
              No data available for this cycle yet.
            </div>
          )}
        </div>

        {/* Top Candidates List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Leaderboard</h2>
          <div className="space-y-3">
            {stats.length > 0 ? (
              stats.slice(0, 5).map((stat, index) => (
                <div key={stat.nomineeId} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm mr-3 shadow-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200' :
                    index === 1 ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' :
                    index === 2 ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200' :
                    'bg-white border text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{stat.nomineeName}</p>
                    <p className="text-xs text-gray-500">{stat.voteCount} votes • {stat.nominationCount} nominations</p>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {Math.round((stat.voteCount / (stats.reduce((acc, curr) => acc + curr.voteCount, 0) || 1)) * 100)}%
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No votes cast yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Employee Directory Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Employee Directory</h2>
            <p className="text-sm text-gray-500 mt-1">Manage user accounts and access.</p>
          </div>
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => handleViewProfile(user)}
                      className="flex items-center cursor-pointer group"
                    >
                      {user.avatar ? (
                        <img 
                          className="h-9 w-9 rounded-full object-cover mr-3 border border-gray-200 group-hover:ring-2 ring-indigo-200 transition-all" 
                          src={user.avatar} 
                          alt={user.name} 
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm mr-3 border border-indigo-200 shadow-sm group-hover:ring-2 ring-indigo-200 transition-all">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {user.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      user.role === UserRole.ADMIN 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {user.role === UserRole.ADMIN ? 'Admin' : 'Employee'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      user.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Employee"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.status === 'ACTIVE' 
                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' 
                            : 'text-red-600 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.status === 'ACTIVE' ? "Deactivate Employee" : "Activate Employee"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Cycle Modal */}
      {isCreateCycleModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Start New Cycle</h3>
              <button 
                onClick={() => setIsCreateCycleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCycleSubmit} className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Starting a new cycle will close any currently active cycles and begin the nomination phase for the selected month.
              </p>
              
              {createCycleError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                  {createCycleError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Month</label>
                  <div className="relative">
                    <select
                      required
                      value={createCycleForm.month}
                      onChange={e => setCreateCycleForm({ ...createCycleForm, month: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 appearance-none transition-all cursor-pointer"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={idx} value={idx}>{m}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                  <input
                    type="number"
                    required
                    min={2023}
                    max={new Date().getFullYear()}
                    value={createCycleForm.year}
                    onChange={e => setCreateCycleForm({ ...createCycleForm, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateCycleModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  Start Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center gap-5">
                {viewingUser.avatar ? (
                  <img src={viewingUser.avatar} alt="" className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold border-4 border-white shadow-sm">
                    {viewingUser.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{viewingUser.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">{viewingUser.department}</span>
                    <span>•</span>
                    <span>{viewingUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      viewingUser.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {viewingUser.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      viewingUser.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {viewingUser.role}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setViewingUser(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Total Nominations</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {userHistory.reduce((acc, h) => acc + h.activity.receivedNominations.length, 0)}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm text-purple-600">
                    <Vote className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">Total Votes Received</p>
                    <p className="text-2xl font-bold text-purple-700">
                       {userHistory.reduce((acc, h) => acc + h.activity.votesReceived, 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                History & Activity
              </h4>
              <div className="space-y-6">
                {userHistory.map((item, idx) => (
                  <div key={idx} className="relative pl-8 pb-2 border-l-2 border-gray-100 last:border-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-4 border-white shadow-sm"></div>
                    
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        {MONTHS[item.cycle.month]} {item.cycle.year}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {item.cycle.status}
                      </span>
                    </div>

                    {/* Received Nominations */}
                    {item.activity.receivedNominations.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {item.activity.receivedNominations.map((nom: any, nIdx: number) => (
                          <div key={nIdx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-start gap-3">
                              <MessageSquare className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                              <div>
                                <p className="text-sm text-gray-800 italic">"{nom.reason}"</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">— Nominated by {nom.from}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User Activity */}
                    <div className="flex gap-4 text-sm text-gray-600 mt-2">
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${item.activity.nominated ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                         {item.activity.nominated ? `Nominated ${item.activity.nominated.name}` : 'Did not nominate'}
                       </div>
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${item.activity.voted ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                         {item.activity.voted ? 'Voted' : 'Did not vote'}
                       </div>
                    </div>
                  </div>
                ))}
                
                {userHistory.length === 0 && (
                   <div className="text-center py-8 text-gray-400">No history found for this employee.</div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setViewingUser(null)}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Employee</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUserUpdate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                <input
                  type="text"
                  required
                  value={editingUser.department}
                  onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  disabled
                  value={editingUser.email}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed shadow-sm"
                />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                  Email cannot be changed
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add New Employee</h3>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="e.g. john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                <input
                  type="text"
                  required
                  value={newUser.department}
                  onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required={false}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 transition-all"
                    placeholder="Leave blank for default (password123)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <div className="relative">
                  <select
                    required
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white text-gray-900 appearance-none transition-all cursor-pointer"
                  >
                    <option value={UserRole.EMPLOYEE}>Employee</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {addUserError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                  {addUserError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};