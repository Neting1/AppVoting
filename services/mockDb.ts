import { User, UserRole, Cycle, CycleStatus, Nomination, Vote, CycleStats } from '../types';

// Initial Bootstrapping Data
const INITIAL_USERS: User[] = [
  // Admin Account (Generic)
  { 
    id: 'admin_main', 
    name: 'Administrator', 
    email: 'admin@twinhill.com', 
    role: UserRole.ADMIN, 
    department: 'Management', 
    status: 'ACTIVE',
    password: 'password123'
  },
  // Nominees / Employees
  { id: 'emp_01', name: 'Emelia Quansah', email: 'emelia.quansah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Human Resources', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_02', name: 'Williams Agyei Frimpong', email: 'williams.frimpong@twinhill.com', role: UserRole.EMPLOYEE, department: 'Engineering', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_03', name: 'Danso Dominic', email: 'danso.dominic@twinhill.com', role: UserRole.EMPLOYEE, department: 'Operations', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_04', name: 'Emmanuel Ayimbilla', email: 'emmanuel.ayimbilla@twinhill.com', role: UserRole.EMPLOYEE, department: 'Finance', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_05', name: 'Vincent Owusu Peprah', email: 'vincent.peprah@twinhill.com', role: UserRole.EMPLOYEE, department: 'IT Support', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_06', name: 'John Amponey', email: 'john.amponey@twinhill.com', role: UserRole.EMPLOYEE, department: 'Logistics', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_07', name: 'Akosua Ampomah', email: 'akosua.ampomah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Marketing', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_08', name: 'Harriet Dwomoh', email: 'harriet.dwomoh@twinhill.com', role: UserRole.EMPLOYEE, department: 'Customer Service', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_09', name: 'Atta Sammy', email: 'atta.sammy@twinhill.com', role: UserRole.EMPLOYEE, department: 'Sales', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_10', name: 'Phillip Boansi', email: 'phillip.boansi@twinhill.com', role: UserRole.EMPLOYEE, department: 'Engineering', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_11', name: 'Isaac Owusu Ansah', email: 'isaac.ansah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Operations', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_12', name: 'Abubakar Alhassan', email: 'abubakar.alhassan@twinhill.com', role: UserRole.EMPLOYEE, department: 'Security', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_13', name: 'Martha Mensah', email: 'martha.mensah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Administration', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_14', name: 'Richard Kusi Amoah', email: 'richard.amoah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Legal', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_15', name: 'Abugre Francis', email: 'abugre.francis@twinhill.com', role: UserRole.EMPLOYEE, department: 'Production', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_16', name: 'Alberta Mba', email: 'alberta.mba@twinhill.com', role: UserRole.EMPLOYEE, department: 'Quality Assurance', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_17', name: 'Cosmos Owusu', email: 'cosmos.owusu@twinhill.com', role: UserRole.EMPLOYEE, department: 'Procurement', status: 'ACTIVE', password: 'password123' },
  { id: 'emp_18', name: 'Kingsley Ayisi', email: 'kingsley.ayisi@twinhill.com', role: UserRole.EMPLOYEE, department: 'Research', status: 'ACTIVE', password: 'password123' }
];

const INITIAL_CYCLES: Cycle[] = [];

// Storage Keys - Updated to force refresh with new data
const KEYS = {
  USERS: 'th_users_v1',
  CYCLES: 'th_cycles_v1',
  NOMINATIONS: 'th_nominations_v1',
  VOTES: 'th_votes_v1'
};

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
  getUsers: (): User[] => getStorage(KEYS.USERS, INITIAL_USERS),
  
  getUserById: (id: string): User | undefined => {
    const users = getStorage<User[]>(KEYS.USERS, INITIAL_USERS);
    return users.find(u => u.id === id);
  },

  getEmployees: (): User[] => {
    return getStorage<User[]>(KEYS.USERS, INITIAL_USERS).filter(u => u.role === UserRole.EMPLOYEE);
  },

  addUser: (user: Omit<User, 'id' | 'status'>): void => {
    const users = getStorage<User[]>(KEYS.USERS, INITIAL_USERS);
    if (users.find(u => u.email === user.email)) {
      throw new Error("User with this email already exists");
    }
    const newUser: User = {
      ...user,
      id: `u${Date.now()}`,
      status: 'ACTIVE'
    };
    users.push(newUser);
    setStorage(KEYS.USERS, users);
  },

  updateUser: (user: User): void => {
    const users = getStorage<User[]>(KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      // Preserve password if not provided in update
      if (!user.password && users[index].password) {
        user.password = users[index].password;
      }
      users[index] = user;
      setStorage(KEYS.USERS, users);
    }
  },

  getCycles: (): Cycle[] => getStorage(KEYS.CYCLES, INITIAL_CYCLES),

  getActiveCycle: (): Cycle | undefined => {
    const cycles = getStorage<Cycle[]>(KEYS.CYCLES, INITIAL_CYCLES);
    // Find open cycle or most recent one
    return cycles.find(c => c.status !== CycleStatus.CLOSED) || cycles[cycles.length - 1];
  },

  createCycle: (month: number, year: number, dates?: {nomStart: number, nomEnd: number, voteStart: number, voteEnd: number}): Cycle => {
    const cycles = getStorage<Cycle[]>(KEYS.CYCLES, INITIAL_CYCLES);
    // Deactivate previous active cycles
    const updatedCycles = cycles.map(c => 
      c.status !== CycleStatus.CLOSED ? { ...c, status: CycleStatus.CLOSED } : c
    );
    
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;

    const newCycle: Cycle = {
      id: `c${Date.now()}`,
      month,
      year,
      status: CycleStatus.NOMINATION,
      nominationStart: dates?.nomStart ?? now,
      nominationEnd: dates?.nomEnd ?? (now + week),
      votingStart: dates?.voteStart ?? (now + week),
      votingEnd: dates?.voteEnd ?? (now + 2 * week)
    };
    
    updatedCycles.push(newCycle);
    setStorage(KEYS.CYCLES, updatedCycles);
    return newCycle;
  },

  updateCycleStatus: (cycleId: string, status: CycleStatus): void => {
    const cycles = getStorage<Cycle[]>(KEYS.CYCLES, INITIAL_CYCLES);
    const updated = cycles.map(c => c.id === cycleId ? { ...c, status } : c);
    setStorage(KEYS.CYCLES, updated);
  },

  setCycleWinner: (cycleId: string, winnerId: string): void => {
    const cycles = getStorage<Cycle[]>(KEYS.CYCLES, INITIAL_CYCLES);
    const updated = cycles.map(c => c.id === cycleId ? { ...c, winnerId } : c);
    setStorage(KEYS.CYCLES, updated);
  },

  getNominations: (cycleId: string): Nomination[] => {
    const all = getStorage<Nomination[]>(KEYS.NOMINATIONS, []);
    return all.filter(n => n.cycleId === cycleId);
  },

  getUserNomination: (userId: string, cycleId: string): Nomination | undefined => {
    const all = getStorage<Nomination[]>(KEYS.NOMINATIONS, []);
    return all.find(n => n.nominatorId === userId && n.cycleId === cycleId);
  },

  addNomination: (nominatorId: string, nomineeId: string, cycleId: string, reason: string): void => {
    const all = getStorage<Nomination[]>(KEYS.NOMINATIONS, []);
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
    setStorage(KEYS.NOMINATIONS, all);
  },

  getVotes: (cycleId: string): Vote[] => {
    const all = getStorage<Vote[]>(KEYS.VOTES, []);
    return all.filter(v => v.cycleId === cycleId);
  },

  getUserVote: (userId: string, cycleId: string): Vote | undefined => {
    const all = getStorage<Vote[]>(KEYS.VOTES, []);
    return all.find(v => v.voterId === userId && v.cycleId === cycleId);
  },

  addVote: (voterId: string, nomineeId: string, cycleId: string): void => {
    const all = getStorage<Vote[]>(KEYS.VOTES, []);
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
    setStorage(KEYS.VOTES, all);
  },

  getCycleStats: (cycleId: string): CycleStats[] => {
    const nominations = getStorage<Nomination[]>(KEYS.NOMINATIONS, []).filter(n => n.cycleId === cycleId);
    const votes = getStorage<Vote[]>(KEYS.VOTES, []).filter(v => v.cycleId === cycleId);
    const employees = getStorage<User[]>(KEYS.USERS, INITIAL_USERS);

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
    const cycles = getStorage<Cycle[]>(KEYS.CYCLES, INITIAL_CYCLES);
    const nominations = getStorage<Nomination[]>(KEYS.NOMINATIONS, []);
    const votes = getStorage<Vote[]>(KEYS.VOTES, []);
    const users = getStorage<User[]>(KEYS.USERS, INITIAL_USERS);

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