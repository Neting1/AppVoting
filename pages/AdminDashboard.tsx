import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, CycleStats, User, UserRole } from '../types';
import { useTheme } from '../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, Play, StopCircle, Archive, Pencil, Power, X, UserPlus, Calendar, Award, MessageSquare, CheckCircle, Vote, Trophy, Lock, Clock, FileBadge, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
// @ts-ignore
import html2canvas from 'html2canvas';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [activeCycle, setActiveCycle] = useState<Cycle | undefined>();
  const [allCycles, setAllCycles] = useState<Cycle[]>([]);
  const [stats, setStats] = useState<CycleStats[]>([]);
  const [winner, setWinner] = useState<User | null>(null);
  
  // Cycle Creation State
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);
  const [createCycleForm, setCreateCycleForm] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    nominationStart: '',
    nominationEnd: '',
    votingStart: '',
    votingEnd: ''
  });
  const [createCycleError, setCreateCycleError] = useState('');

  // Employee Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Directory Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User | 'name', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

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

  // Certificate State
  const [certificateData, setCertificateData] = useState<{user: User, cycle: Cycle} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    try {
      try {
        const fetchedCycles = await dbService.getCycles();
        setAllCycles(fetchedCycles);
      } catch (e) {
        console.warn("Failed to fetch all cycles", e);
      }

      const cycle = await dbService.getActiveCycle();
      setActiveCycle(cycle);
      if (cycle) {
        try {
          const stats = await dbService.getCycleStats(cycle.id);
          setStats(stats || []);
          if (cycle.winnerId) {
            const winnerUser = await dbService.getUserById(cycle.winnerId);
            setWinner(winnerUser || null);
          } else {
            setWinner(null);
          }
        } catch (statError) {
          console.warn("Failed to load cycle stats", statError);
          setStats([]);
        }
      }
      
      try {
        const allUsers = await dbService.getUsers();
        setUsers(allUsers || []);
      } catch (userError) {
        console.warn("Failed to load users for admin", userError);
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load admin data", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const triggerCelebration = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({ 
        ...defaults, 
        particleCount, 
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#6366f1', '#a855f7', '#fbbf24', '#10b981'] // Indigo, Purple, Amber, Emerald
      });
      confetti({ 
        ...defaults, 
        particleCount, 
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#6366f1', '#a855f7', '#fbbf24', '#10b981']
      });
    }, 250);
  };

  useEffect(() => {
    if (winner && activeCycle?.status === CycleStatus.CLOSED) {
      triggerCelebration();
    }
  }, [winner?.id, activeCycle?.status]);

  const uniqueDepartments = Array.from(new Set(users.map(u => u.department))).filter(Boolean).sort();

  const getFilteredAndSortedUsers = () => {
    let result = [...users];
    if (filterRole !== 'ALL') result = result.filter(u => u.role === filterRole);
    if (filterStatus !== 'ALL') result = result.filter(u => u.status === filterStatus);
    if (filterDepartment !== 'ALL') result = result.filter(u => u.department === filterDepartment);
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.email.toLowerCase().includes(query)
        );
    }
    result.sort((a, b) => {
        const aValue = (a[sortConfig.key as keyof User] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key as keyof User] || '').toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return result;
  };

  const processedUsers = getFilteredAndSortedUsers();

  const handleSort = (key: keyof User) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: keyof User }) => {
    if (sortConfig.key !== column) return <ChevronDown className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-30 transition-opacity" />;
    return sortConfig.direction === 'asc' 
        ? <ChevronUp className="w-4 h-4 ml-1 text-indigo-600 dark:text-indigo-400" />
        : <ChevronDown className="w-4 h-4 ml-1 text-indigo-600 dark:text-indigo-400" />;
  };

  const handleOpenCreateCycle = () => {
    const now = new Date();
    const nomEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const voteStart = nomEnd;
    const voteEnd = new Date(nomEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    const toLocalISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setCreateCycleForm({ 
        month: now.getMonth(), 
        year: now.getFullYear(),
        nominationStart: toLocalISO(now),
        nominationEnd: toLocalISO(nomEnd),
        votingStart: toLocalISO(voteStart),
        votingEnd: toLocalISO(voteEnd)
    });
    setCreateCycleError('');
    setIsCreateCycleModalOpen(true);
  };

  const handleCreateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCycleError('');

    if (activeCycle && activeCycle.status !== CycleStatus.CLOSED) {
        setCreateCycleError("Cannot create a new cycle while the current cycle is still active. Please close it first.");
        return;
    }

    const nomStart = new Date(createCycleForm.nominationStart).getTime();
    const nomEnd = new Date(createCycleForm.nominationEnd).getTime();
    const voteStart = new Date(createCycleForm.votingStart).getTime();
    const voteEnd = new Date(createCycleForm.votingEnd).getTime();
    const nowBuffer = Date.now() - 60000;

    if (nomStart < nowBuffer) {
        setCreateCycleError("Nomination start date cannot be in the past.");
        return;
    }
    if (nomEnd <= nomStart) {
        setCreateCycleError("Nomination end date must be strictly after start date.");
        return;
    }
    if (voteStart < nomEnd) {
        setCreateCycleError("Voting must start strictly after nomination ends.");
        return;
    }
    if (voteEnd <= voteStart) {
        setCreateCycleError("Voting end date must be strictly after voting start date.");
        return;
    }
    
    try {
        await dbService.createCycle(
            createCycleForm.month, 
            createCycleForm.year,
            { nomStart, nomEnd, voteStart, voteEnd }
        );
        setIsCreateCycleModalOpen(false);
        refreshData();
    } catch (e: any) {
        setCreateCycleError("Failed to create cycle: " + e.message);
    }
  };

  const updateStatus = async (status: CycleStatus) => {
    if (activeCycle) {
      await dbService.updateCycleStatus(activeCycle.id, status);
      refreshData();
    }
  };

  const handleDeclareWinner = async () => {
    if (!activeCycle || stats.length === 0) return;
    const leader = stats[0];
    if (leader.voteCount > 0) {
      await dbService.setCycleWinner(activeCycle.id, leader.nomineeId);
      await dbService.updateCycleStatus(activeCycle.id, CycleStatus.CLOSED);
      await refreshData();
      triggerCelebration();
    }
  };

  const handleExport = async () => {
    if (!activeCycle) return;
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

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current || !certificateData) return;
    const { user, cycle } = certificateData;
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(certificateRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
        });
        const link = document.createElement('a');
        link.download = `Certificate_${user.name.replace(/\s+/g, '_')}_${MONTHS[cycle.month]}_${cycle.year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Certificate generation failed", err);
        alert("Could not generate certificate. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };

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
        password: newUser.password || 'password123'
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

  const renderWinnerSection = () => {
    if (winner) {
      return (
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between w-full">
          <div className="flex items-center gap-6">
            <div className="relative">
                {winner.avatar ? (
                <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
                ) : (
                <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-3xl font-bold border-4 border-white shadow-lg">
                    {winner.name.charAt(0)}
                </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white p-2 rounded-full shadow-md animate-bounce">
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

          <button 
             onClick={() => activeCycle && setCertificateData({ user: winner, cycle: activeCycle })}
             className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/40 rounded-xl font-semibold shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center"
          >
             <FileBadge className="w-5 h-5 mr-2" />
             Download Certificate
          </button>
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

  const pastWinners = allCycles
    .filter(c => c.status === CycleStatus.CLOSED && c.winnerId)
    .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage voting cycles, view results, and manage employees.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenCreateCycle}
            disabled={!!activeCycle && activeCycle.status !== CycleStatus.CLOSED}
            className={`flex items-center px-5 py-2.5 text-white rounded-lg text-sm font-semibold shadow-sm transition-all ${
              activeCycle && activeCycle.status !== CycleStatus.CLOSED
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 active:scale-95'
            }`}
            title={activeCycle && activeCycle.status !== CycleStatus.CLOSED ? "Close current cycle to start a new one" : "Start New Cycle"}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Cycle
          </button>
        </div>
      </div>

      {/* Cycle Management Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Current Cycle Status</h2>
        
        {activeCycle ? (
          <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 dark:bg-gray-700 p-5 rounded-xl border border-gray-100 dark:border-gray-600">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold text-gray-900 dark:text-white mr-3">
                {MONTHS[activeCycle.month]} {activeCycle.year}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${activeCycle.status === CycleStatus.NOMINATION ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 
                  activeCycle.status === CycleStatus.VOTING ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                {activeCycle.status}
              </span>
              {activeCycle.nominationEnd && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                   <Clock className="w-3 h-3 mr-1" />
                   {activeCycle.status === CycleStatus.NOMINATION 
                     ? `Nomination ends ${new Date(activeCycle.nominationEnd).toLocaleDateString()} ${new Date(activeCycle.nominationEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                     : activeCycle.status === CycleStatus.VOTING
                        ? `Voting ends ${new Date(activeCycle.votingEnd).toLocaleDateString()} ${new Date(activeCycle.votingEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                        : `Ended on ${new Date(activeCycle.votingEnd).toLocaleDateString()}`
                   }
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {activeCycle.status === CycleStatus.NOMINATION && (
                <button 
                  onClick={() => updateStatus(CycleStatus.VOTING)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500 text-sm font-medium transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Force Start Voting
                </button>
              )}
              {activeCycle.status === CycleStatus.VOTING && (
                <button 
                  onClick={() => updateStatus(CycleStatus.CLOSED)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-500 text-sm font-medium transition-colors shadow-sm"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Close Cycle
                </button>
              )}
              {activeCycle.status === CycleStatus.CLOSED && (
                <button disabled className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-300 rounded-lg cursor-not-allowed text-sm font-medium border border-gray-200 dark:border-gray-500">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived
                </button>
              )}
            </div>
          </div>
        ) : (
           <div className="text-center py-10 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
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
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-w-0 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Real-time Results</h2>
            <button 
              onClick={handleExport}
              disabled={stats.length === 0}
              className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>
          </div>
          
          {stats.length > 0 ? (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                  <XAxis dataKey="nomineeName" axisLine={false} tickLine={false} tick={{fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12}} />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? '#1f2937' : '#f9fafb' }}
                    contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        color: theme === 'dark' ? '#fff' : '#000',
                        borderRadius: '8px', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                    }}
                  />
                  <Legend wrapperStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }} />
                  <Bar dataKey="nominationCount" name="Nominations" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="voteCount" name="Votes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/30 rounded-lg text-gray-400 border border-dashed border-gray-200 dark:border-gray-600">
              No data available for this cycle yet.
            </div>
          )}
        </div>

        {/* Top Candidates List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Leaderboard</h2>
          <div className="space-y-3">
            {stats.length > 0 ? (
              stats.slice(0, 5).map((stat, index) => (
                <div key={stat.nomineeId} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm mr-3 shadow-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-800' :
                    'bg-white border text-gray-500 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{stat.nomineeName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.voteCount} votes • {stat.nominationCount} nominations</p>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
                    {Math.round((stat.voteCount / (stats.reduce((acc, curr) => acc + curr.voteCount, 0) || 1)) * 100)}%
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No votes cast yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Hall of Fame / Past Winners */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hall of Fame</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">History of past Employee of the Month winners.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Winner</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {pastWinners.length > 0 ? (
                pastWinners.map(cycle => {
                  const winnerUser = users.find(u => u.id === cycle.winnerId);
                  return (
                    <tr key={cycle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {MONTHS[cycle.month]} {cycle.year}
                      </td>
                      <td className="px-6 py-4">
                        {winnerUser ? (
                          <div className="flex items-center">
                            {winnerUser.avatar ? (
                              <img src={winnerUser.avatar} className="w-8 h-8 rounded-full mr-3 object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs mr-3">
                                {winnerUser.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">{winnerUser.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unknown User</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {winnerUser?.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {winnerUser && (
                          <button 
                            onClick={() => setCertificateData({ user: winnerUser, cycle })}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs inline-flex items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded"
                          >
                            <FileBadge className="w-3 h-3 mr-1" />
                            Certificate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No past winners recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Directory Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Directory</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage user accounts and access.</p>
          </div>
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center justify-center px-4 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>

        {/* Directory Filters & Search */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search employees..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
            </div>
            
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                    value={filterRole} 
                    onChange={e => setFilterRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                    <option value="ALL">All Roles</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.EMPLOYEE}>Employee</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400"></div>
                <select 
                     value={filterStatus}
                     onChange={e => setFilterStatus(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
            </div>

            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                     value={filterDepartment}
                     onChange={e => setFilterDepartment(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                    <option value="ALL">All Departments</option>
                    {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-600 uppercase tracking-wider text-xs">
              <tr>
                <th 
                    className="px-6 py-4 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none" 
                    onClick={() => handleSort('name')}
                >
                    <div className="flex items-center">
                        Name <SortIcon column="name" />
                    </div>
                </th>
                <th 
                    className="px-6 py-4 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                    onClick={() => handleSort('email')}
                >
                    <div className="flex items-center">
                        Email <SortIcon column="email" />
                    </div>
                </th>
                <th 
                    className="px-6 py-4 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                    onClick={() => handleSort('department')}
                >
                    <div className="flex items-center">
                        Department <SortIcon column="department" />
                    </div>
                </th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {processedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => handleViewProfile(user)}
                      className="flex items-center cursor-pointer group"
                    >
                      {user.avatar ? (
                        <img 
                          className="h-9 w-9 rounded-full object-cover mr-3 border border-gray-200 dark:border-gray-600 group-hover:ring-2 ring-indigo-200 transition-all" 
                          src={user.avatar} 
                          alt={user.name} 
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm mr-3 border border-indigo-200 dark:border-indigo-700 shadow-sm group-hover:ring-2 ring-indigo-200 transition-all">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {user.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      user.role === UserRole.ADMIN 
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                      {user.role === UserRole.ADMIN ? 'Admin' : 'Employee'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      user.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:text-gray-400 dark:hover:text-indigo-400 rounded-lg transition-colors"
                        title="Edit Employee"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.status === 'ACTIVE' 
                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-gray-400 dark:hover:text-red-400' 
                            : 'text-red-600 hover:text-green-600 hover:bg-green-50 dark:text-red-400 dark:hover:text-green-400 dark:hover:bg-green-900/30'
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
          {processedUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
               <Search className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
               <p>No employees found matching your filters.</p>
               <button 
                 onClick={() => {
                   setSearchQuery('');
                   setFilterRole('ALL');
                   setFilterStatus('ALL');
                   setFilterDepartment('ALL');
                 }}
                 className="mt-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
               >
                 Clear all filters
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {certificateData && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white">Certificate Preview</h3>
                    <button onClick={() => setCertificateData(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-8 bg-gray-100 dark:bg-gray-900 flex justify-center">
                    {/* Certificate Container to Capture */}
                    <div 
                        ref={certificateRef}
                        className="bg-white w-[800px] h-[600px] shadow-2xl relative flex flex-col p-12 text-center items-center justify-between border-[16px] border-double border-[#C5A059]"
                        style={{ minWidth: '800px', minHeight: '600px', color: 'black' }} // Force black text for certificate
                    >
                        {/* Decorative Corners */}
                        <div className="absolute top-4 left-4 w-24 h-24 border-t-4 border-l-4 border-[#C5A059] opacity-50"></div>
                        <div className="absolute top-4 right-4 w-24 h-24 border-t-4 border-r-4 border-[#C5A059] opacity-50"></div>
                        <div className="absolute bottom-4 left-4 w-24 h-24 border-b-4 border-l-4 border-[#C5A059] opacity-50"></div>
                        <div className="absolute bottom-4 right-4 w-24 h-24 border-b-4 border-r-4 border-[#C5A059] opacity-50"></div>

                        {/* Content */}
                        <div className="z-10 w-full flex flex-col items-center h-full justify-between">
                            <div className="flex flex-col items-center gap-2 mt-4">
                                <Award className="w-16 h-16 text-[#C5A059]" />
                                <h1 className="text-5xl font-serif-display font-bold text-gray-900 tracking-wider uppercase mb-2">Certificate</h1>
                                <p className="text-xl font-serif-display tracking-[0.3em] text-[#C5A059] uppercase">of Recognition</p>
                            </div>

                            <div className="my-8 w-full">
                                <p className="text-gray-500 italic text-lg mb-6">This certificate is proudly presented to</p>
                                <h2 className="text-6xl font-signature text-gray-900 mb-6 px-8 border-b-2 border-gray-200 pb-2 inline-block min-w-[50%]">
                                    {certificateData.user.name}
                                </h2>
                                <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                                    For outstanding performance and dedication, having been voted by colleagues as the
                                    <span className="font-bold text-[#C5A059] block mt-2 text-2xl font-serif-display">Employee of the Month</span>
                                </p>
                            </div>

                            <div className="flex justify-between w-full px-12 mt-auto mb-4 items-end">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2 min-w-[200px]">
                                        {MONTHS[certificateData.cycle.month]} {certificateData.cycle.year}
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Date</p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full border-4 border-[#C5A059] flex items-center justify-center mb-2 bg-[#C5A059]/10">
                                        <Trophy className="w-10 h-10 text-[#C5A059]" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 tracking-widest uppercase">Twinhill Enterprise</p>
                                </div>

                                <div className="text-center">
                                    <div className="text-2xl font-signature text-gray-800 border-b border-gray-400 pb-1 mb-2 min-w-[200px]">
                                        Twinhill Admin
                                    </div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Signature</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800 rounded-b-xl">
                    <button 
                        onClick={() => setCertificateData(null)}
                        className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg"
                    >
                        Close
                    </button>
                    <button 
                        onClick={handleDownloadCertificate}
                        disabled={isDownloading}
                        className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#b08d4b] text-white font-bold rounded-lg shadow-sm flex items-center disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download Image
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* New Cycle Modal */}
      {isCreateCycleModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start New Cycle</h3>
              <button 
                onClick={() => setIsCreateCycleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCycleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  placeholder="e.g. john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Department</label>
                <input
                  type="text"
                  required
                  value={newUser.department}
                  onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required={false}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    placeholder="Leave blank for default (password123)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                <div className="relative">
                  <select
                    required
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none transition-all cursor-pointer"
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
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50 flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                  {addUserError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
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