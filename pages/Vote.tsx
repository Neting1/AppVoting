import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Cycle, CycleStatus, User, Nomination } from '../types';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export const Vote: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCycle, setActiveCycle] = useState<Cycle | undefined>();
  const [candidates, setCandidates] = useState<{ user: User, nominations: number }[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cycle = await dbService.getActiveCycle();
        setActiveCycle(cycle);

        const now = Date.now();
        const isOpen = cycle && 
                       cycle.status === CycleStatus.VOTING && 
                       (!cycle.votingStart || now >= cycle.votingStart) &&
                       (!cycle.votingEnd || now < cycle.votingEnd);

        if (isOpen && cycle) {
          const nominations = await dbService.getNominations(cycle.id);
          const candidateMap = new Map<string, number>();
          nominations.forEach(n => {
            const count = candidateMap.get(n.nomineeId) || 0;
            candidateMap.set(n.nomineeId, count + 1);
          });

          const validCandidates: { user: User, nominations: number }[] = [];
          const employees = await dbService.getEmployees();

          candidateMap.forEach((count, id) => {
             const emp = employees.find(e => e.id === id);
             if (emp) {
               validCandidates.push({ user: emp, nominations: count });
             }
          });

          validCandidates.sort((a, b) => b.nominations - a.nominations);
          setCandidates(validCandidates);
        }

        if (user && cycle) {
          const existing = await dbService.getUserVote(user.id, cycle.id);
          if (existing) {
            setSuccess(true);
          }
        }
      } catch (error) {
        console.error("Failed to load voting data", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle || !user || !selectedCandidate) return;

    if (activeCycle.votingEnd && Date.now() > activeCycle.votingEnd) {
        setError("The voting period has ended.");
        return;
    }

    try {
      await dbService.addVote(user.id, selectedCandidate, activeCycle.id);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
     return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading candidates...</div>;
  }

  const now = Date.now();
  const isClosed = !activeCycle || 
                   activeCycle.status !== CycleStatus.VOTING || 
                   (activeCycle.votingStart && now < activeCycle.votingStart) ||
                   (activeCycle.votingEnd && now > activeCycle.votingEnd);

  if (isClosed) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Voting Closed</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">The voting phase is currently inactive.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vote Submitted!</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Your voice has been heard.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cast Your Vote</h2>
        <p className="text-gray-500 dark:text-gray-400">Choose from the list of nominated colleagues for this month.</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
           <p className="text-gray-500 dark:text-gray-400">No candidates were nominated this month.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map(({ user: candidate, nominations }) => (
            <label 
              key={candidate.id} 
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                selectedCandidate === candidate.id 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700'
              }`}
            >
              <input
                type="radio"
                name="candidate"
                value={candidate.id}
                checked={selectedCandidate === candidate.id}
                onChange={() => setSelectedCandidate(candidate.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {candidate.name}
                    {candidate.id === user?.id && <span className="text-xs text-purple-600 dark:text-purple-400 ml-2">(You)</span>}
                  </h3>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    {candidate.department}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Received {nominations} nomination{nominations !== 1 ? 's' : ''}
                </p>
              </div>
              <div className={`ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedCandidate === candidate.id
                  ? 'border-purple-600 bg-purple-600 dark:border-purple-500 dark:bg-purple-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedCandidate === candidate.id && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </label>
          ))}
          
          <div className="col-span-full mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!selectedCandidate}
              className="px-8 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Vote
            </button>
          </div>
        </form>
      )}
    </div>
  );
};