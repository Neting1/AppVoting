import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../services/mockDb';
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

  useEffect(() => {
    const cycle = mockDb.getActiveCycle();
    setActiveCycle(cycle);

    if (cycle && cycle.status === CycleStatus.VOTING) {
      // Get all nominations for this cycle
      const nominations = mockDb.getNominations(cycle.id);
      
      // Group nominations to find candidates
      const candidateMap = new Map<string, number>();
      nominations.forEach(n => {
        const count = candidateMap.get(n.nomineeId) || 0;
        candidateMap.set(n.nomineeId, count + 1);
      });

      // Filter out current user from candidates (prevent self-voting)
      const validCandidates: { user: User, nominations: number }[] = [];
      const employees = mockDb.getEmployees();

      candidateMap.forEach((count, id) => {
        if (id !== user?.id) {
           const emp = employees.find(e => e.id === id);
           if (emp) {
             validCandidates.push({ user: emp, nominations: count });
           }
        }
      });

      // Sort by nomination count (optional, but looks nice)
      validCandidates.sort((a, b) => b.nominations - a.nominations);
      setCandidates(validCandidates);
    }

    if (user && cycle) {
      const existing = mockDb.getUserVote(user.id, cycle.id);
      if (existing) {
        setSuccess(true);
      }
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle || !user || !selectedCandidate) return;

    try {
      mockDb.addVote(user.id, selectedCandidate, activeCycle.id);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!activeCycle || activeCycle.status !== CycleStatus.VOTING) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Voting Closed</h2>
        <p className="text-gray-500 mt-2">The voting phase is currently inactive.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Vote Submitted!</h2>
        <p className="text-gray-600 mt-2">Your voice has been heard.</p>
        <p className="text-gray-400 text-sm mt-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Cast Your Vote</h2>
        <p className="text-gray-500">Choose from the list of nominated colleagues for this month.</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
           <p className="text-gray-500">No candidates were nominated this month.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map(({ user: candidate, nominations }) => (
            <label 
              key={candidate.id} 
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                selectedCandidate === candidate.id 
                  ? 'border-purple-600 bg-purple-50' 
                  : 'border-gray-200 bg-white hover:border-purple-200'
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
                  <h3 className="font-bold text-gray-900">{candidate.name}</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {candidate.department}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Received {nominations} nomination{nominations !== 1 ? 's' : ''}
                </p>
              </div>
              <div className={`ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedCandidate === candidate.id
                  ? 'border-purple-600 bg-purple-600'
                  : 'border-gray-300'
              }`}>
                {selectedCandidate === candidate.id && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </label>
          ))}
          
          <div className="col-span-full mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!selectedCandidate}
              className="px-8 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Vote
            </button>
          </div>
        </form>
      )}
    </div>
  );
};