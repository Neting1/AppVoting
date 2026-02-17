import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, Nomination, Vote } from '../types';
import { Calendar, UserCheck, Vote as VoteIcon, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeCycle, setActiveCycle] = useState<Cycle | undefined>(undefined);
  const [userNomination, setUserNomination] = useState<Nomination | undefined>(undefined);
  const [userVote, setUserVote] = useState<Vote | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const cycle = await dbService.getActiveCycle();
        setActiveCycle(cycle);

        if (user && cycle) {
          try {
            const [nomination, vote] = await Promise.all([
              dbService.getUserNomination(user.id, cycle.id),
              dbService.getUserVote(user.id, cycle.id)
            ]);
            setUserNomination(nomination);
            setUserVote(vote);
          } catch (userDataError) {
             // Silently fail user specific data load if main cycle loaded but permissions block user data
          }
        }
      } catch (error: any) {
        // Only show error if it's strictly not a permission error or if needed
        // Permission errors are now largely suppressed in db.ts to return empty/undefined
        if (error.code !== 'permission-denied') {
             console.error("Error loading dashboard cycle data", error);
             setError("Unable to load dashboard data. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user]);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-gray-500 animate-pulse">Loading dashboard...</div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-red-100">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <WifiOff className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Connection Error</h3>
        <p className="text-gray-500 mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          <Calendar className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Active Cycles</h3>
        <p className="text-gray-500 mt-2">There are currently no active voting cycles. Please check back later.</p>
      </div>
    );
  }

  const getStatusColor = (status: CycleStatus) => {
    switch (status) {
      case CycleStatus.NOMINATION: return 'bg-blue-100 text-blue-800';
      case CycleStatus.VOTING: return 'bg-green-100 text-green-800';
      case CycleStatus.CLOSED: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="text-gray-500">Here is your activity for the current cycle.</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-medium text-sm inline-flex items-center self-start ${getStatusColor(activeCycle.status)}`}>
          <Calendar className="w-4 h-4 mr-2" />
          {MONTHS[activeCycle.month]} {activeCycle.year} - {activeCycle.status}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nomination Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <UserCheck className="w-6 h-6 text-indigo-600" />
              </div>
              {userNomination ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nomination</h3>
            <p className="text-gray-600 mb-6 min-h-[3rem]">
              {userNomination 
                ? "You have successfully submitted your nomination for this cycle."
                : activeCycle.status === CycleStatus.NOMINATION 
                  ? "Nominate a deserving colleague for their outstanding work."
                  : "Nominations are currently closed for this cycle."
              }
            </p>
            
            {userNomination ? (
               <button disabled className="w-full py-2 px-4 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                 Nomination Submitted
               </button>
            ) : (
              <Link 
                to="/nominate"
                className={`block w-full text-center py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeCycle.status === CycleStatus.NOMINATION
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                Make a Nomination
              </Link>
            )}
          </div>
        </div>

        {/* Voting Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <VoteIcon className="w-6 h-6 text-purple-600" />
              </div>
              {userVote ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Voting</h3>
            <p className="text-gray-600 mb-6 min-h-[3rem]">
              {userVote
                ? "Thank you for casting your vote."
                : activeCycle.status === CycleStatus.VOTING
                  ? "Cast your vote for the final candidates."
                  : activeCycle.status === CycleStatus.NOMINATION
                    ? "Voting will open once the nomination phase is complete."
                    : "Voting is closed."
              }
            </p>

            {userVote ? (
               <button disabled className="w-full py-2 px-4 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                 Vote Submitted
               </button>
            ) : (
              <Link 
                to="/vote"
                className={`block w-full text-center py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeCycle.status === CycleStatus.VOTING
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                Cast Vote
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-blue-900">How it works</h4>
          <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Nominations are anonymous.</li>
            <li>You can only nominate one person per cycle.</li>
            <li>Voting opens after the nomination phase ends.</li>
            <li>You cannot nominate yourself, but you can vote for yourself if nominated.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};