import { User, UserRole, Cycle, CycleStatus, Nomination, Vote, CycleStats } from '../types';

// Initial Bootstrapping Data
// Contains only a default system administrator to allow initial setup.
const INITIAL_USERS: User[] = [
  { 
    id: 'sys_admin', 
    name: 'System Administrator', 
    email: 'admin@company.com', 
    role: UserRole.ADMIN, 
    department: 'System Administration', 
    status: 'ACTIVE',
    password: 'admin123'
  }
];

const INITIAL_CYCLES: Cycle[] = [];

// Helper to access LocalStorage safely
const getStorage = <T,>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const setStorage = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Database Service Simulation
export const mockDb = {
  getUsers: (): User[] => getStorage('users', INITIAL_USERS),
  
  getUserById: (id: string): User | undefined => {
    const users = getStorage<User[]>('users', INITIAL_USERS);
    return users.find(u => u.id === id);
  },

  getEmployees: (): User[] => {
    return getStorage<User[]>('users', INITIAL_USERS).filter(u => u.role === UserRole.EMPLOYEE);
  },

  addUser: (user: Omit<User, 'id' | 'status'>): void => {
    const users = getStorage<User[]>('users', INITIAL_USERS);
    if (users.find(u => u.email === user.email)) {
      throw new Error("User with this email already exists");
    }
    const newUser: User = {
      ...user,
      id: `u${Date.now()}`,
      status: 'ACTIVE'
    };
    users.push(newUser);
    setStorage('users', users);
  },

  updateUser: (user: User): void => {
    const users = getStorage<User[]>('users', INITIAL_USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      // Preserve password if not provided in update
      if (!user.password && users[index].password) {
        user.password = users[index].password;
      }
      users[index] = user;
      setStorage('users', users);
    }
  },

  getCycles: (): Cycle[] => getStorage('cycles', INITIAL_CYCLES),

  getActiveCycle: (): Cycle | undefined => {
    const cycles = getStorage<Cycle[]>('cycles', INITIAL_CYCLES);
    // Find open cycle or most recent one
    return cycles.find(c => c.status !== CycleStatus.CLOSED) || cycles[cycles.length - 1];
  },

  createCycle: (month: number, year: number): Cycle => {
    const cycles = getStorage<Cycle[]>('cycles', INITIAL_CYCLES);
    // Deactivate previous active cycles
    const updatedCycles = cycles.map(c => 
      c.status !== CycleStatus.CLOSED ? { ...c, status: CycleStatus.CLOSED } : c
    );
    
    const newCycle: Cycle = {
      id: `c${Date.now()}`,
      month,
      year,
      status: CycleStatus.NOMINATION
    };
    
    updatedCycles.push(newCycle);
    setStorage('cycles', updatedCycles);
    return newCycle;
  },

  updateCycleStatus: (cycleId: string, status: CycleStatus): void => {
    const cycles = getStorage<Cycle[]>('cycles', INITIAL_CYCLES);
    const updated = cycles.map(c => c.id === cycleId ? { ...c, status } : c);
    setStorage('cycles', updated);
  },

  setCycleWinner: (cycleId: string, winnerId: string): void => {
    const cycles = getStorage<Cycle[]>('cycles', INITIAL_CYCLES);
    const updated = cycles.map(c => c.id === cycleId ? { ...c, winnerId } : c);
    setStorage('cycles', updated);
  },

  getNominations: (cycleId: string): Nomination[] => {
    const all = getStorage<Nomination[]>('nominations', []);
    return all.filter(n => n.cycleId === cycleId);
  },

  getUserNomination: (userId: string, cycleId: string): Nomination | undefined => {
    const all = getStorage<Nomination[]>('nominations', []);
    return all.find(n => n.nominatorId === userId && n.cycleId === cycleId);
  },

  addNomination: (nominatorId: string, nomineeId: string, cycleId: string, reason: string): void => {
    const all = getStorage<Nomination[]>('nominations', []);
    if (all.find(n => n.nominatorId === nominatorId && n.cycleId === cycleId)) {
      throw new Error("You have already nominated someone this cycle.");
    }
    const newNomination: Nomination = {
      id: `n${Date.now()}`,
      nominatorId,
      nomineeId,
      cycleId,
      reason,
      timestamp: Date.now()
    };
    all.push(newNomination);
    setStorage('nominations', all);
  },

  getVotes: (cycleId: string): Vote[] => {
    const all = getStorage<Vote[]>('votes', []);
    return all.filter(v => v.cycleId === cycleId);
  },

  getUserVote: (userId: string, cycleId: string): Vote | undefined => {
    const all = getStorage<Vote[]>('votes', []);
    return all.find(v => v.voterId === userId && v.cycleId === cycleId);
  },

  addVote: (voterId: string, nomineeId: string, cycleId: string): void => {
    const all = getStorage<Vote[]>('votes', []);
    if (all.find(v => v.voterId === voterId && v.cycleId === cycleId)) {
      throw new Error("You have already voted this cycle.");
    }
    const newVote: Vote = {
      id: `v${Date.now()}`,
      voterId,
      nomineeId,
      cycleId,
      timestamp: Date.now()
    };
    all.push(newVote);
    setStorage('votes', all);
  },

  getCycleStats: (cycleId: string): CycleStats[] => {
    const nominations = getStorage<Nomination[]>('nominations', []).filter(n => n.cycleId === cycleId);
    const votes = getStorage<Vote[]>('votes', []).filter(v => v.cycleId === cycleId);
    const employees = getStorage<User[]>('users', INITIAL_USERS);

    const statsMap = new Map<string, CycleStats>();

    // Initialize for all employees who received at least one nomination
    nominations.forEach(nom => {
      if (!statsMap.has(nom.nomineeId)) {
        const emp = employees.find(e => e.id === nom.nomineeId);
        if (emp) {
          statsMap.set(nom.nomineeId, {
            nomineeId: emp.id,
            nomineeName: emp.name,
            nominationCount: 0,
            voteCount: 0
          });
        }
      }
      const stat = statsMap.get(nom.nomineeId);
      if (stat) stat.nominationCount++;
    });

    // Count votes
    votes.forEach(vote => {
       if (!statsMap.has(vote.nomineeId)) {
         const emp = employees.find(e => e.id === vote.nomineeId);
         if (emp) {
            statsMap.set(vote.nomineeId, {
              nomineeId: emp.id,
              nomineeName: emp.name,
              nominationCount: 0,
              voteCount: 0
            });
         }
       }
       const stat = statsMap.get(vote.nomineeId);
       if (stat) stat.voteCount++;
    });

    return Array.from(statsMap.values()).sort((a, b) => b.voteCount - a.voteCount);
  },

  getEmployeeHistory: (userId: string) => {
    const cycles = getStorage<Cycle[]>('cycles', INITIAL_CYCLES);
    const nominations = getStorage<Nomination[]>('nominations', []);
    const votes = getStorage<Vote[]>('votes', []);
    const users = getStorage<User[]>('users', INITIAL_USERS);

    return cycles.map(cycle => {
      const myNomination = nominations.find(n => n.cycleId === cycle.id && n.nominatorId === userId);
      const myVote = votes.find(v => v.cycleId === cycle.id && v.voterId === userId);
      const receivedNoms = nominations.filter(n => n.cycleId === cycle.id && n.nomineeId === userId);
      const receivedVotes = votes.filter(v => v.cycleId === cycle.id && v.nomineeId === userId).length;

      const nomineeName = myNomination ? users.find(u => u.id === myNomination.nomineeId)?.name || 'Unknown' : undefined;
      
      return {
        cycle,
        activity: {
          nominated: myNomination ? { name: nomineeName, reason: myNomination.reason } : null,
          voted: !!myVote,
          receivedNominations: receivedNoms.map(n => ({
            from: users.find(u => u.id === n.nominatorId)?.name || 'Unknown',
            reason: n.reason
          })),
          votesReceived: receivedVotes
        }
      };
    }).sort((a, b) => (b.cycle.year * 12 + b.cycle.month) - (a.cycle.year * 12 + a.cycle.month));
  }
};