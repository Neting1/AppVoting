import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  addDoc,
  getDoc,
  writeBatch,
  getCountFromServer,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { User, UserRole, Cycle, CycleStatus, Nomination, Vote, CycleStats } from '../types';

// Helper to handle Firestore permission errors gracefully
// In a real app, we would handle this with specific UI feedback
const safeGetDocs = async (q: any) => {
  try {
    return await getDocs(q);
  } catch (error: any) {
    console.error("Firestore operation failed:", error.code, error.message);
    // Return empty snapshot-like object to prevents app crash
    return { empty: true, docs: [] };
  }
};

// Initial Users Data for Seeding
const INITIAL_USERS: Omit<User, 'status'>[] = [
  { id: 'admin_main', name: 'Administrator', email: 'admin@twinhill.com', role: UserRole.ADMIN, department: 'Management', password: 'password123' },
  { id: 'emp_01', name: 'Emelia Quansah', email: 'emelia.quansah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Human Resources', password: 'password123' },
  { id: 'emp_02', name: 'Williams Agyei Frimpong', email: 'williams.frimpong@twinhill.com', role: UserRole.EMPLOYEE, department: 'Engineering', password: 'password123' },
  { id: 'emp_03', name: 'Danso Dominic', email: 'danso.dominic@twinhill.com', role: UserRole.EMPLOYEE, department: 'Operations', password: 'password123' },
  { id: 'emp_04', name: 'Emmanuel Ayimbilla', email: 'emmanuel.ayimbilla@twinhill.com', role: UserRole.EMPLOYEE, department: 'Finance', password: 'password123' },
  { id: 'emp_05', name: 'Vincent Owusu Peprah', email: 'vincent.peprah@twinhill.com', role: UserRole.EMPLOYEE, department: 'IT Support', password: 'password123' },
  { id: 'emp_06', name: 'John Amponey', email: 'john.amponey@twinhill.com', role: UserRole.EMPLOYEE, department: 'Logistics', password: 'password123' },
  { id: 'emp_07', name: 'Akosua Ampomah', email: 'akosua.ampomah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Marketing', password: 'password123' },
  { id: 'emp_08', name: 'Harriet Dwomoh', email: 'harriet.dwomoh@twinhill.com', role: UserRole.EMPLOYEE, department: 'Customer Service', password: 'password123' },
  { id: 'emp_09', name: 'Atta Sammy', email: 'atta.sammy@twinhill.com', role: UserRole.EMPLOYEE, department: 'Sales', password: 'password123' },
  { id: 'emp_10', name: 'Phillip Boansi', email: 'phillip.boansi@twinhill.com', role: UserRole.EMPLOYEE, department: 'Engineering', password: 'password123' },
  { id: 'emp_11', name: 'Isaac Owusu Ansah', email: 'isaac.ansah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Operations', password: 'password123' },
  { id: 'emp_12', name: 'Abubakar Alhassan', email: 'abubakar.alhassan@twinhill.com', role: UserRole.EMPLOYEE, department: 'Security', password: 'password123' },
  { id: 'emp_13', name: 'Martha Mensah', email: 'martha.mensah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Administration', password: 'password123' },
  { id: 'emp_14', name: 'Richard Kusi Amoah', email: 'richard.amoah@twinhill.com', role: UserRole.EMPLOYEE, department: 'Legal', password: 'password123' },
  { id: 'emp_15', name: 'Abugre Francis', email: 'abugre.francis@twinhill.com', role: UserRole.EMPLOYEE, department: 'Production', password: 'password123' },
  { id: 'emp_16', name: 'Alberta Mba', email: 'alberta.mba@twinhill.com', role: UserRole.EMPLOYEE, department: 'Quality Assurance', password: 'password123' },
  { id: 'emp_17', name: 'Cosmos Owusu', email: 'cosmos.owusu@twinhill.com', role: UserRole.EMPLOYEE, department: 'Procurement', password: 'password123' },
  { id: 'emp_18', name: 'Kingsley Ayisi', email: 'kingsley.ayisi@twinhill.com', role: UserRole.EMPLOYEE, department: 'Research', password: 'password123' }
];

// Database Service with Firestore
export const dbService = {
  seedInitialUsers: async (): Promise<void> => {
    try {
      const userColl = collection(db, 'users');
      const snapshot = await getCountFromServer(userColl);
      if (snapshot.data().count > 0) return;

      console.log("Seeding initial users to Firestore...");
      const batch = writeBatch(db);
      
      INITIAL_USERS.forEach(user => {
        const userRef = doc(userColl, user.id);
        const userData: User = { ...user, status: 'ACTIVE' };
        if ('password' in userData) delete userData.password;
        batch.set(userRef, userData);
      });

      await batch.commit();
    } catch (e) {
      console.error("Failed to seed users", e);
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await safeGetDocs(collection(db, 'users'));
      if (snapshot.empty) {
        await dbService.seedInitialUsers();
        // Retry fetch after seeding attempt
        const retrySnapshot = await safeGetDocs(collection(db, 'users'));
        return retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      console.error("Error getting users:", e);
      return [];
    }
  },
  
  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
    } catch (error) {
      console.error("Error getting user profile:", error);
    }
    return undefined;
  },

  getEmployees: async (): Promise<User[]> => {
    const users = await dbService.getUsers();
    return users.filter(u => u.role === UserRole.EMPLOYEE);
  },

  createUserProfile: async (uid: string, user: Omit<User, 'id' | 'status'>): Promise<void> => {
    let role = user.role;
    try {
      // If first user in DB, make admin
      const coll = collection(db, 'users');
      const snapshot = await getCountFromServer(coll);
      if (snapshot.data().count === 0) role = UserRole.ADMIN;
    } catch (error) {
      console.warn("Could not check user count", error);
    }

    const newUserRef = doc(db, 'users', uid);
    const newUser: User = {
      ...user,
      id: uid,
      role: role,
      status: 'ACTIVE'
    };
    if ('password' in newUser) delete newUser.password;

    await setDoc(newUserRef, newUser);
  },

  addUser: async (user: Omit<User, 'id' | 'status'>): Promise<void> => {
    // Check for email existence in current list to avoid dupes (client-side check for efficiency)
    const existingUsers = await dbService.getUsers();
    if (existingUsers.find(u => u.email === user.email)) {
        throw new Error("User with this email already exists");
    }

    const newUserRef = doc(collection(db, 'users'));
    const newUser: User = {
      ...user,
      id: newUserRef.id,
      status: 'ACTIVE'
    };
    if ('password' in newUser) delete newUser.password;

    await setDoc(newUserRef, newUser);
  },

  updateUser: async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    const userData = { ...user };
    if ('password' in userData) delete userData.password;
    await updateDoc(userRef, userData);
  },

  getCycles: async (): Promise<Cycle[]> => {
    try {
      const snapshot = await safeGetDocs(collection(db, 'cycles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
    } catch (e) {
      console.error("Error getting cycles", e);
      return [];
    }
  },

  getActiveCycle: async (): Promise<Cycle | undefined> => {
    try {
      // Fetch all cycles to avoid composite index requirement errors
      // In a large system, this would be paginated or indexed, but for <100 cycles it's fine.
      const snapshot = await safeGetDocs(collection(db, 'cycles'));
      if (snapshot.empty) return undefined;
      
      const cycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
      
      // 1. Check for Nomination
      const nominationCycle = cycles.find(c => c.status === CycleStatus.NOMINATION);
      if (nominationCycle) return nominationCycle;

      // 2. Check for Voting
      const votingCycle = cycles.find(c => c.status === CycleStatus.VOTING);
      if (votingCycle) return votingCycle;

      // 3. Get most recent Closed
      // Sort descending by year then month
      cycles.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      // Return the most recent one
      return cycles[0];
    } catch (error) {
      console.error("Error fetching active cycle", error);
      return undefined;
    }
  },

  createCycle: async (month: number, year: number): Promise<Cycle> => {
    // 1. Close any open cycles first (Best effort)
    try {
        const snapshot = await safeGetDocs(collection(db, 'cycles'));
        const batch = writeBatch(db);
        let updates = 0;
        
        snapshot.docs.forEach(d => {
            const data = d.data();
            if (data.status === CycleStatus.NOMINATION || data.status === CycleStatus.VOTING) {
                batch.update(d.ref, { status: CycleStatus.CLOSED });
                updates++;
            }
        });
        
        if (updates > 0) await batch.commit();
    } catch (e) {
        console.warn("Could not auto-close previous cycles", e);
    }

    // 2. Create new cycle in Firestore
    const cycleData = {
      month,
      year,
      status: CycleStatus.NOMINATION
    };
    
    const docRef = await addDoc(collection(db, 'cycles'), cycleData);
    return { id: docRef.id, ...cycleData } as Cycle;
  },

  updateCycleStatus: async (cycleId: string, status: CycleStatus): Promise<void> => {
    const cycleRef = doc(db, 'cycles', cycleId);
    await updateDoc(cycleRef, { status });
  },

  setCycleWinner: async (cycleId: string, winnerId: string): Promise<void> => {
    const cycleRef = doc(db, 'cycles', cycleId);
    await updateDoc(cycleRef, { winnerId });
  },

  getNominations: async (cycleId: string): Promise<Nomination[]> => {
    const q = query(collection(db, 'nominations'), where("cycleId", "==", cycleId));
    const snapshot = await safeGetDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nomination));
  },

  getUserNomination: async (userId: string, cycleId: string): Promise<Nomination | undefined> => {
    const q = query(
      collection(db, 'nominations'), 
      where("nominatorId", "==", userId),
      where("cycleId", "==", cycleId)
    );
    const snapshot = await safeGetDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Nomination;
    }
    return undefined;
  },

  addNomination: async (nominatorId: string, nomineeId: string, cycleId: string, reason: string): Promise<void> => {
    const existing = await dbService.getUserNomination(nominatorId, cycleId);
    if (existing) {
      throw new Error("You have already nominated someone this cycle.");
    }
    
    const nomData = {
      nominatorId,
      nomineeId,
      cycleId,
      reason,
      timestamp: Date.now()
    };
    await addDoc(collection(db, 'nominations'), nomData);
  },

  getVotes: async (cycleId: string): Promise<Vote[]> => {
    const q = query(collection(db, 'votes'), where("cycleId", "==", cycleId));
    const snapshot = await safeGetDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
  },

  getUserVote: async (userId: string, cycleId: string): Promise<Vote | undefined> => {
    const q = query(
      collection(db, 'votes'), 
      where("voterId", "==", userId),
      where("cycleId", "==", cycleId)
    );
    const snapshot = await safeGetDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vote;
    }
    return undefined;
  },

  addVote: async (voterId: string, nomineeId: string, cycleId: string): Promise<void> => {
    const existing = await dbService.getUserVote(voterId, cycleId);
    if (existing) {
      throw new Error("You have already voted this cycle.");
    }

    const voteData = {
      voterId,
      nomineeId,
      cycleId,
      timestamp: Date.now()
    };
    await addDoc(collection(db, 'votes'), voteData);
  },

  getCycleStats: async (cycleId: string): Promise<CycleStats[]> => {
    try {
        const nominations = await dbService.getNominations(cycleId);
        const votes = await dbService.getVotes(cycleId);
        const employees = await dbService.getUsers(); 

        const statsMap = new Map<string, CycleStats>();

        nominations.forEach(nom => {
        if (!statsMap.has(nom.nomineeId)) {
            const emp = employees.find(e => e.id === nom.nomineeId);
            const name = emp ? emp.name : "Employee"; 
            
            statsMap.set(nom.nomineeId, {
                nomineeId: nom.nomineeId,
                nomineeName: name,
                nominationCount: 0,
                voteCount: 0
            });
        }
        const stat = statsMap.get(nom.nomineeId);
        if (stat) stat.nominationCount++;
        });

        votes.forEach(vote => {
        if (!statsMap.has(vote.nomineeId)) {
            const emp = employees.find(e => e.id === vote.nomineeId);
            const name = emp ? emp.name : "Employee"; 

            statsMap.set(vote.nomineeId, {
                nomineeId: vote.nomineeId,
                nomineeName: name,
                nominationCount: 0,
                voteCount: 0
            });
        }
        const stat = statsMap.get(vote.nomineeId);
        if (stat) stat.voteCount++;
        });

        return Array.from(statsMap.values()).sort((a, b) => b.voteCount - a.voteCount);
    } catch (e) {
        return [];
    }
  },

  getEmployeeHistory: async (userId: string) => {
    try {
        const cycles = await dbService.getCycles();
        
        let nominations: Nomination[] = [];
        let votes: Vote[] = [];
        
        try {
            const nomSnap = await safeGetDocs(collection(db, 'nominations'));
            nominations = nomSnap.docs.map(d => d.data() as Nomination);
            const voteSnap = await safeGetDocs(collection(db, 'votes'));
            votes = voteSnap.docs.map(d => d.data() as Vote);
        } catch(e) {
            console.error("Error fetching history data", e);
        }
        
        const users = await dbService.getUsers();

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
    } catch (e) {
        return [];
    }
  }
};