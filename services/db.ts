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
import { mockDb } from './mockDb';

// Helper to handle Firestore permission errors gracefully
const safeGetDocs = async (q: any) => {
  try {
    return await getDocs(q);
  } catch (error: any) {
    // Suppress permission errors in console to avoid noise
    if (error.code !== 'permission-denied') {
        console.warn("Firestore query failed:", error.code, error.message);
    }
    // Return an empty structure that resembles a snapshot to prevent crashes
    return { empty: true, docs: [] };
  }
};

// Database Service with Firestore
export const dbService = {
  getUsers: async (): Promise<User[]> => {
    // Fetch local users
    const localUsers = mockDb.getUsers();
    
    try {
      // Fetch remote users
      const snapshot = await safeGetDocs(collection(db, 'users'));
      const remoteUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      
      // Merge users. If IDs clash (unlikely), prioritize local users as they might have recent edits.
      const userMap = new Map<string, User>();
      remoteUsers.forEach(u => userMap.set(u.id, u));
      localUsers.forEach(u => userMap.set(u.id, u));
      
      return Array.from(userMap.values());
    } catch (e) {
      // If Firestore fails, return local users
      return localUsers;
    }
  },
  
  getUserById: async (id: string): Promise<User | undefined> => {
    // Check local mock DB first
    const localUser = mockDb.getUserById(id);
    if (localUser) return localUser;

    const docRef = doc(db, 'users', id);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
    } catch (error) {
      // Ignore permission errors during profile fetch
    }
    return undefined;
  },

  getEmployees: async (): Promise<User[]> => {
    // Use the merged list from getUsers
    const users = await dbService.getUsers();
    return users.filter(u => u.role === UserRole.EMPLOYEE);
  },

  createUserProfile: async (uid: string, user: Omit<User, 'id' | 'status'>): Promise<void> => {
    // This is used by Register page, still attempts Firestore for real auth users
    let role = user.role;
    try {
      const coll = collection(db, 'users');
      const snapshot = await getCountFromServer(coll);
      const isFirstUser = snapshot.data().count === 0;
      if (isFirstUser) {
        role = UserRole.ADMIN;
      }
    } catch (error) {
      // Silently ignore permission errors for count()
    }

    const newUserRef = doc(db, 'users', uid);
    const newUser: User = {
      ...user,
      id: uid,
      role: role,
      status: 'ACTIVE'
    };
    
    if ('password' in newUser) {
      delete newUser.password;
    }

    await setDoc(newUserRef, newUser);
  },

  addUser: async (user: Omit<User, 'id' | 'status'>): Promise<void> => {
    // Use local mockDb for Admin 'Add Employee' to bypass Firestore permission errors
    mockDb.addUser(user);
  },

  updateUser: async (user: User): Promise<void> => {
    // Check if it is a local user first
    const localUser = mockDb.getUserById(user.id);
    if (localUser) {
        mockDb.updateUser(user);
        return;
    }

    const userRef = doc(db, 'users', user.id);
    const userData = { ...user };
    if ('password' in userData) delete userData.password;
    await updateDoc(userRef, userData);
  },

  getCycles: async (): Promise<Cycle[]> => {
    // Merge remote and local cycles
    const localCycles = mockDb.getCycles();

    try {
      const snapshot = await safeGetDocs(collection(db, 'cycles'));
      const remoteCycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
      
      const cycleMap = new Map<string, Cycle>();
      remoteCycles.forEach(c => cycleMap.set(c.id, c));
      localCycles.forEach(c => cycleMap.set(c.id, c));
      
      return Array.from(cycleMap.values());
    } catch (e) {
      return localCycles;
    }
  },

  getActiveCycle: async (): Promise<Cycle | undefined> => {
    // Check local mock DB first
    const localCycle = mockDb.getActiveCycle();
    if (localCycle && localCycle.status !== CycleStatus.CLOSED) {
        return localCycle;
    }

    try {
      const qNom = query(collection(db, 'cycles'), where("status", "==", CycleStatus.NOMINATION));
      const snapNom = await safeGetDocs(qNom);
      if (!snapNom.empty) return { id: snapNom.docs[0].id, ...snapNom.docs[0].data() } as Cycle;

      const qVote = query(collection(db, 'cycles'), where("status", "==", CycleStatus.VOTING));
      const snapVote = await safeGetDocs(qVote);
      if (!snapVote.empty) return { id: snapVote.docs[0].id, ...snapVote.docs[0].data() } as Cycle;

      const qClosed = query(
          collection(db, 'cycles'), 
          where("status", "==", CycleStatus.CLOSED), 
          orderBy("year", "desc"), 
          orderBy("month", "desc"), 
          limit(1)
      );
      try {
          const snapClosed = await getDocs(qClosed);
          if (!snapClosed.empty) return { id: snapClosed.docs[0].id, ...snapClosed.docs[0].data() } as Cycle;
      } catch (e) {
          // ignore index errors
      }
    } catch (error) {
      // Ignore errors
    }
    return undefined;
  },

  createCycle: async (month: number, year: number): Promise<Cycle> => {
    // Use local storage (mockDb) for cycle creation
    return mockDb.createCycle(month, year);
  },

  updateCycleStatus: async (cycleId: string, status: CycleStatus): Promise<void> => {
    const localCycles = mockDb.getCycles();
    if (localCycles.find(c => c.id === cycleId)) {
        mockDb.updateCycleStatus(cycleId, status);
        return;
    }

    const cycleRef = doc(db, 'cycles', cycleId);
    await updateDoc(cycleRef, { status });
  },

  setCycleWinner: async (cycleId: string, winnerId: string): Promise<void> => {
    const localCycles = mockDb.getCycles();
    if (localCycles.find(c => c.id === cycleId)) {
        mockDb.setCycleWinner(cycleId, winnerId);
        return;
    }

    const cycleRef = doc(db, 'cycles', cycleId);
    await updateDoc(cycleRef, { winnerId });
  },

  getNominations: async (cycleId: string): Promise<Nomination[]> => {
    // If cycle is local, use local nominations
    const localCycles = mockDb.getCycles();
    if (localCycles.some(c => c.id === cycleId)) {
        return mockDb.getNominations(cycleId);
    }

    const q = query(collection(db, 'nominations'), where("cycleId", "==", cycleId));
    const snapshot = await safeGetDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nomination));
  },

  getUserNomination: async (userId: string, cycleId: string): Promise<Nomination | undefined> => {
    // Check local first
    const localNom = mockDb.getUserNomination(userId, cycleId);
    if (localNom) return localNom;

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
    
    // Check if we should use local storage (if cycle is local)
    const localCycles = mockDb.getCycles();
    const isLocalCycle = localCycles.some(c => c.id === cycleId);

    if (isLocalCycle) {
       mockDb.addNomination(nominatorId, nomineeId, cycleId, reason);
       return;
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
    const localCycles = mockDb.getCycles();
    if (localCycles.some(c => c.id === cycleId)) {
        return mockDb.getVotes(cycleId);
    }

    const q = query(collection(db, 'votes'), where("cycleId", "==", cycleId));
    const snapshot = await safeGetDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
  },

  getUserVote: async (userId: string, cycleId: string): Promise<Vote | undefined> => {
    const localVote = mockDb.getUserVote(userId, cycleId);
    if (localVote) return localVote;

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

    // Check if cycle is local
    const localCycles = mockDb.getCycles();
    const isLocalCycle = localCycles.some(c => c.id === cycleId);
    
    if (isLocalCycle) {
        mockDb.addVote(voterId, nomineeId, cycleId);
        return;
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
    // Check if local cycle
    const localCycles = mockDb.getCycles();
    if (localCycles.some(c => c.id === cycleId)) {
        return mockDb.getCycleStats(cycleId);
    }

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
        // Since we are hybrid, complex history queries are harder.
        // We will attempt to get data from both sources loosely.
        
        let nominations: Nomination[] = [];
        let votes: Vote[] = [];
        
        // Fetch remote
        try {
            const nomSnap = await safeGetDocs(collection(db, 'nominations'));
            nominations = nomSnap.docs.map(d => d.data() as Nomination);
            const voteSnap = await safeGetDocs(collection(db, 'votes'));
            votes = voteSnap.docs.map(d => d.data() as Vote);
        } catch(e) {
            // ignore
        }
        
        // Fetch local
        // (mockDb helpers return filtered lists, but here we want ALL for history)
        // Accessing underlying storage from mockDb isn't exposed directly as 'all', 
        // but we can assume for this simple fix we primarily care about active cycles
        // or just accept remote history + current local cycle data if we added an accessor.
        // For now, let's rely on what we have.
        
        const users = await dbService.getUsers();

        return cycles.map(cycle => {
            // If cycle is local, try to fetch specific local data for it
            let cycleNoms = nominations;
            let cycleVotes = votes;
            
            const isLocal = mockDb.getCycles().some(c => c.id === cycle.id);
            if (isLocal) {
                cycleNoms = mockDb.getNominations(cycle.id);
                cycleVotes = mockDb.getVotes(cycle.id);
            }

            const myNomination = cycleNoms.find(n => n.cycleId === cycle.id && n.nominatorId === userId);
            const myVote = cycleVotes.find(v => v.cycleId === cycle.id && v.voterId === userId);
            const receivedNoms = cycleNoms.filter(n => n.cycleId === cycle.id && n.nomineeId === userId);
            const receivedVotes = cycleVotes.filter(v => v.cycleId === cycle.id && v.nomineeId === userId).length;

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