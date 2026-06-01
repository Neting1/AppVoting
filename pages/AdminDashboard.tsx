import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, CycleStats, User, UserRole } from '../types';
import { useTheme } from '../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, Play, StopCircle, Archive, Pencil, Power, X, UserPlus, Calendar, Award, MessageSquare, CheckCircle, XCircle, Vote, Trophy, Lock, Clock, FileBadge, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'celebrate' | 'professional' | 'short'>('celebrate');
  const [textCopied, setTextCopied] = useState(false);

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

  const toLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenCreateCycle = () => {
    const now = new Date();
    const nomEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const voteStart = nomEnd;
    const voteEnd = new Date(nomEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
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

    const nomStart = new Date(createCycleForm.nominationStart).getTime();
    const nomEnd = new Date(createCycleForm.nominationEnd).getTime();
    const voteStart = new Date(createCycleForm.votingStart).getTime();
    const voteEnd = new Date(createCycleForm.votingEnd).getTime();
    const nowBuffer = Date.now() - 5 * 60000; // 5 minutes buffer

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

  const getCongratulationsText = () => {
    if (!certificateData) return '';
    const { user, cycle } = certificateData;
    const monthYear = `${MONTHS[cycle.month]} ${cycle.year}`;
    const name = user.name;
    const dept = user.department || 'Twinhill Team';

    switch (whatsAppTemplate) {
      case 'professional':
        return `🎖️ *Twinhill Enterprise Recognition of Excellence* 🎖️\n\nWe are pleased to announce *${name}* as the official recipient of the *Employee of the Month* award for *${monthYear}*!\n\n⭐ *${name}*\n💼 *${dept}* Department\n\nThis recognition is a direct result of nominations and votes by peers who highlighted ${name}'s consistent dedication, professional standard, and positive impact on our team's success. \n\nCongratulations, ${name}, on this well-deserved honour, and thank you for your ongoing commitment to our core values. 👏💼⭐`;
      case 'short':
        return `🎉 Huge congratulations to *${name}* for winning the *Employee of the Month* award for *${monthYear}*! 🏆 ⭐\n\nYour colleagues at Twinhill Enterprise appreciate your outstanding work and dedication. Keep shining! 🚀👏🔥\n\n#TwinhillEnterprise #EmployeeOfTheMonth #TeamSuccess`;
      case 'celebrate':
      default:
        return `🏆 *EMPLOYEE OF THE MONTH* 🏆\n\nLet us all join in celebrating our incredible colleague, *${name}*, who has been voted *Employee of the Month* for *${monthYear}*! 🥳🎉👏\n\n⭐ *${name}* ⭐\n🏢 Department: *${dept}*\n\nThank you, ${name}, for your exceptional work ethic, support, and outstanding contribution to Twinhill Enterprise. Your dedication inspires all of us! 🚀🔥💼\n\nLet's flood the chat with congratulations! 🍾👇🤩🎈`;
    }
  };

  const handleCopyMessage = () => {
    const text = getCongratulationsText();
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = getCongratulationsText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEditClick = (user: User) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleViewProfile = async (user: User) => {
    setViewingUser(user);
    setIsProfileModalOpen(true);
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
            className="flex items-center px-5 py-2.5 text-white rounded-lg text-sm font-semibold shadow-sm transition-all bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 active:scale-95"
            title="Start New Cycle"
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
                    <h3 className="font-bold text-gray-800 dark:text-white">Certificate & Celebrations Console</h3>
                    <button onClick={() => setCertificateData(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-8 bg-gray-100 dark:bg-gray-900 flex flex-col items-center gap-8">
                    {/* Certificate Container to Capture */}
                    <div 
                        ref={certificateRef}
                        className="bg-white w-[800px] h-[600px] shadow-2xl relative flex flex-col p-12 text-center items-center justify-between"
                        style={{ 
                            minWidth: '800px', 
                            minHeight: '600px', 
                            color: 'black',
                            border: '14px solid #C5A059',
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        {/* Thin Inner Gold Border Line */}
                        <div 
                            className="absolute pointer-events-none" 
                            style={{ 
                                top: '16px', 
                                bottom: '16px', 
                                left: '16px', 
                                right: '16px', 
                                border: '1.5px solid #C5A059',
                                opacity: 0.7
                            }}
                        />

                        {/* Classic L-Shaped Corner Ornaments */}
                        <div className="absolute top-[24px] left-[24px] w-14 h-14 border-t-2 border-l-2 border-[#C5A059] pointer-events-none"></div>
                        <div className="absolute top-[24px] right-[24px] w-14 h-14 border-t-2 border-r-2 border-[#C5A059] pointer-events-none"></div>
                        <div className="absolute bottom-[24px] left-[24px] w-14 h-14 border-b-2 border-l-2 border-[#C5A059] pointer-events-none"></div>
                        <div className="absolute bottom-[24px] right-[24px] w-14 h-14 border-b-2 border-r-2 border-[#C5A059] pointer-events-none"></div>

                        {/* Bottom Center Seal Arch */}
                        <div 
                            className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 w-28 h-14 border-t-2 border-x-2 border-[#C5A059] bg-white rounded-t-full flex items-center justify-center pointer-events-none shadow-[0_-2px_10px_rgba(0,0,0,0.02)]"
                            style={{ zIndex: 10 }}
                        >
                            <div className="w-20 h-10 border-t border-x border-[#C5A059]/50 rounded-t-full flex items-center justify-center pt-1 bg-white">
                                <Award className="w-6 h-6 text-[#C5A059]" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="z-10 w-full flex flex-col items-center h-full justify-between" style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}>
                            {/* Header Section */}
                            <div className="flex flex-col items-center gap-2 mt-4">
                                <svg className="w-16 h-16 text-[#C5A059] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    {/* Medal Outer Circle */}
                                    <circle cx="12" cy="9" r="6" stroke="#C5A059" fill="none" />
                                    <circle cx="12" cy="9" r="4.5" stroke="#C5A059" strokeDasharray="1.5 1.5" />
                                    {/* Ribbons */}
                                    <path d="M9.5 14.5L7 21L12 19L17 21L14.5 14.5" stroke="#C5A059" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <h1 
                                    className="text-[44px] font-extrabold text-gray-900 tracking-[0.2em] uppercase leading-none"
                                    style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                >
                                    Certificate
                                </h1>
                                <p 
                                    className="text-xs font-bold tracking-[0.45em] text-[#C5A059] uppercase mt-2"
                                    style={{ fontFamily: '"Inter", sans-serif' }}
                                >
                                    of recognition
                                </p>
                            </div>

                            {/* Recipient Presentation */}
                            <div className="w-full flex flex-col items-center">
                                <p 
                                    className="text-gray-500 italic text-[17px] mb-6"
                                    style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                >
                                    This certificate is proudly presented to
                                </p>
                                
                                <div className="flex items-center justify-center w-full my-1">
                                    <div className="h-[1px] bg-[#C5A059]/30 flex-1 max-w-[150px]"></div>
                                    <h2 
                                        className="text-[54px] font-signature text-gray-900 px-8 relative -top-3 select-none leading-none"
                                        style={{ fontFamily: '"Great Vibes", cursive', fontWeight: 'normal' }}
                                    >
                                        {certificateData.user.name}
                                    </h2>
                                    <div className="h-[1px] bg-[#C5A059]/30 flex-1 max-w-[150px]"></div>
                                </div>

                                <p 
                                    className="text-gray-600 text-[16px] max-w-xl mx-auto leading-relaxed mt-4"
                                    style={{ fontFamily: '"Times New Roman", Times, Georgia, serif', color: '#444444' }}
                                >
                                    For outstanding performance and dedication, having been voted by colleagues as the
                                    <span 
                                        className="font-extrabold text-[#C5A059] block mt-3 text-2xl tracking-[0.08em] uppercase"
                                        style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                    >
                                        Employee of the Month
                                    </span>
                                </p>
                            </div>

                            {/* Signatures and Date */}
                            <div className="flex justify-between w-full px-8 mt-auto mb-4 items-end">
                                <div className="text-center w-[200px]">
                                    <div 
                                        className="text-base font-bold text-gray-800 border-b border-[#C5A059]/30 pb-1 mb-2"
                                        style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                                    >
                                        {MONTHS[certificateData.cycle.month]} {certificateData.cycle.year}
                                    </div>
                                    <p 
                                        className="text-[9px] text-[#C5A059] uppercase tracking-[0.2em] font-bold"
                                        style={{ fontFamily: '"Inter", sans-serif' }}
                                    >
                                        Date
                                    </p>
                                </div>

                                <div className="flex flex-col items-center flex-1">
                                    {/* Small central insignia if needed */}
                                    <div className="w-3"></div>
                                </div>

                                <div className="text-center w-[200px]">
                                    <div 
                                        className="text-[28px] text-gray-800 border-b border-[#C5A059]/30 pb-1 mb-1 leading-none"
                                        style={{ fontFamily: '"Great Vibes", cursive', fontWeight: 'normal' }}
                                    >
                                        Twinhill Admin
                                    </div>
                                    <p 
                                        className="text-[9px] text-[#C5A059] uppercase tracking-[0.2em] font-bold"
                                        style={{ fontFamily: '"Inter", sans-serif' }}
                                    >
                                        Signature
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Congratulations Section */}
                    <div className="w-[800px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 flex flex-col gap-4 text-left">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-green-500/10 text-green-600 rounded-lg dark:text-green-400">
                                    <MessageSquare className="w-5 h-5 animate-bounce" />
                                </span>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-base">WhatsApp Congratulations Message</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose a style below to copy or directly draft on WhatsApp to recognize the recipient!</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900/30 dark:text-green-400 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" /> Template Ready
                            </span>
                        </div>

                        {/* Template Tabs Selector */}
                        <div className="flex border-b border-gray-150 dark:border-gray-700 gap-1 p-1 bg-gray-50 dark:bg-gray-900/60 rounded-lg">
                            <button
                                onClick={() => setWhatsAppTemplate('celebrate')}
                                className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                    whatsAppTemplate === 'celebrate'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <span>🎉</span> High Energy
                            </button>
                            <button
                                onClick={() => setWhatsAppTemplate('professional')}
                                className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                    whatsAppTemplate === 'professional'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <span>🎖️</span> Formal & Warm
                            </button>
                            <button
                                onClick={() => setWhatsAppTemplate('short')}
                                className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                    whatsAppTemplate === 'short'
                                        ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <span>⚡</span> Short & Sweet
                            </button>
                        </div>

                        {/* Message Preview Board */}
                        <div className="relative mt-2">
                            <textarea
                                value={getCongratulationsText()}
                                readOnly
                                className="w-full h-44 p-4 text-[13px] font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none text-gray-800 dark:text-gray-200 leading-relaxed resize-none cursor-text shadow-inner"
                            />
                            
                            <div className="absolute top-3 right-3 flex gap-2">
                                <button
                                    onClick={handleCopyMessage}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 ${
                                        textCopied
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-250 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {textCopied ? (
                                        <>
                                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-3.5 h-3.5 rotate-180" />
                                            Copy Text
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Direct Share Options */}
                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={handleCopyMessage}
                                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-250 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4 rotate-180" />
                                {textCopied ? 'Copied successfully!' : 'Copy to Clipboard'}
                            </button>
                            
                            <button
                                onClick={handleShareWhatsApp}
                                className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
                            >
                                <svg className="w-5 h-5 fill-current text-white mr-1" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm12.007-3.93c1.8-.001 3.565.483 5.093 1.396l.366.218 3.784-.992-.1.972-.511-.1-.365.1c-.812 1.29-1.928 2.296-3.232 2.9l-.367-.218c-1.42 1.157-3.178 1.776-5.011 1.777C6.88 20.046 2.76 15.933 2.76 10.89c.001-1.636.432-3.236 1.248-4.654l.216-.376L3.22 2.076l3.876.1-.1.353c1.233.918 2.378 1.403 3.655 1.404h.01c4.116 0 7.464 3.348 7.464 7.463 0 4.114-3.348 7.462-7.462 7.462v.1zm.1-13.6h-.1" />
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.4a.1.1" />
                                </svg>
                                Send Directly with WhatsApp
                            </button>
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
                        className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#b08d4b] text-white font-bold rounded-lg shadow-md flex items-center disabled:opacity-50"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start New Cycle</h3>
              <button 
                onClick={() => setIsCreateCycleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCycleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Month</label>
                  <select
                    value={createCycleForm.month}
                    onChange={e => setCreateCycleForm({ ...createCycleForm, month: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Year</label>
                  <input
                    type="number"
                    required
                    value={createCycleForm.year}
                    onChange={e => setCreateCycleForm({ ...createCycleForm, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nomination Start</label>
                <input
                  type="datetime-local"
                  required
                  min={toLocalISO(new Date())}
                  value={createCycleForm.nominationStart}
                  onChange={e => setCreateCycleForm({ ...createCycleForm, nominationStart: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nomination End</label>
                <input
                  type="datetime-local"
                  required
                  min={createCycleForm.nominationStart || toLocalISO(new Date())}
                  value={createCycleForm.nominationEnd}
                  onChange={e => setCreateCycleForm({ ...createCycleForm, nominationEnd: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Voting Start</label>
                <input
                  type="datetime-local"
                  required
                  min={createCycleForm.nominationEnd || toLocalISO(new Date())}
                  value={createCycleForm.votingStart}
                  onChange={e => setCreateCycleForm({ ...createCycleForm, votingStart: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Voting End</label>
                <input
                  type="datetime-local"
                  required
                  min={createCycleForm.votingStart || toLocalISO(new Date())}
                  value={createCycleForm.votingEnd}
                  onChange={e => setCreateCycleForm({ ...createCycleForm, votingEnd: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {createCycleError && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50 flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                  {createCycleError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateCycleModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Employee</h3>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-5 overflow-y-auto">
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

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Employee</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUserUpdate} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Department</label>
                <input
                  type="text"
                  required
                  value={editingUser.department}
                  onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                <div className="relative">
                  <select
                    required
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
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

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
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
      {/* User Profile Modal */}
      {isProfileModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Employee Profile & History</h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
                  {viewingUser.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUser.name}</h4>
                  <p className="text-gray-500 dark:text-gray-400">{viewingUser.department} • {viewingUser.role}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      viewingUser.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {viewingUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div>
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity History</h5>
                {userHistory.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No activity history found.</p>
                ) : (
                  <div className="space-y-4">
                    {userHistory.map((historyItem, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {MONTHS[historyItem.cycle.month]} {historyItem.cycle.year}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                            historyItem.cycle.status === 'CLOSED' ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                            historyItem.cycle.status === 'VOTING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {historyItem.cycle.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Actions Taken */}
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions Taken</h6>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              {historyItem.activity.nominated ? (
                                <><CheckCircle className="w-4 h-4 text-green-500" /> Nominated {historyItem.activity.nominated.name}</>
                              ) : (
                                <><XCircle className="w-4 h-4 text-gray-400" /> Did not nominate</>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              {historyItem.activity.voted ? (
                                <><CheckCircle className="w-4 h-4 text-green-500" /> Voted</>
                              ) : (
                                <><XCircle className="w-4 h-4 text-gray-400" /> Did not vote</>
                              )}
                            </div>
                          </div>

                          {/* Recognition Received */}
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recognition Received</h6>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">{historyItem.activity.receivedNominations.length}</span> Nominations
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">{historyItem.activity.votesReceived}</span> Votes
                            </div>
                          </div>
                        </div>

                        {/* Nomination Reasons */}
                        {historyItem.activity.receivedNominations.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Nomination Comments</h6>
                            <ul className="space-y-2">
                              {historyItem.activity.receivedNominations.map((nom: any, i: number) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <span className="font-medium text-gray-900 dark:text-white">{nom.from}:</span> "{nom.reason}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;