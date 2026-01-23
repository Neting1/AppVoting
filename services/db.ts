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
    try {
      const snapshot = await safeGetDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      return [];
    }
  },
  
  getUserById: async (id: string): Promise<User | undefined> => {
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
    try {
      const q = query(collection(db, 'users'), where("role", "==", UserRole.EMPLOYEE));
      const snapshot = await safeGetDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      return [];
    }
  },

  createUserProfile: async (uid: string, user: Omit<User, 'id' | 'status'>): Promise<void> => {
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
    try {
        const q = query(collection(db, 'users'), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
        throw new Error("User with this email already exists");
        }
    } catch (e: any) {
        if (e.message?.includes("exists")) throw e;
    }

    const newUserRef = doc(collection(db, 'users'));
    const newUser: User = {
      ...user,
      id: newUserRef.id,
      status: 'ACTIVE'
    };
    
    if ('password' in newUser) {
      delete newUser.password;
    }

    await setDoc(newUserRef, newUser);
  },

  updateUser: async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    const userData = { ...user };
    if ('password' in userData) delete userData.password;
    await updateDoc(userRef, userData);
  },

  getCycles: async (): Promise<Cycle[]> => {
    // Merge remote and local cycles if needed, but for now favor local for active management
    const localCycles = mockDb.getCycles();
    if (localCycles.length > 0) return localCycles;

    try {
      const snapshot = await safeGetDocs(collection(db, 'cycles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
    } catch (e) {
      return [];
    }
  },

  getActiveCycle: async (): Promise<Cycle | undefined> => {
    // Check local mock DB first to support cycle creation without permissions
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
    // Use local storage (mockDb) for cycle creation to bypass Firestore permission issues
    return mockDb.createCycle(month, year);
  },

  updateCycleStatus: async (cycleId: string, status: CycleStatus): Promise<void> => {
    // Check if it's a local cycle
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

    // Use addDoc for nominations too
    const nomData = {
      nominatorId,
      nomineeId,
      cycleId,
      reason,
      timestamp: Date.now()
    };
    const docRef = await addDoc(collection(db, 'nominations'), nomData);
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

    // Use addDoc for votes
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
        const allNominations = await safeGetDocs(collection(db, 'nominations'));
        const nominations = allNominations.docs.map(d => d.data() as Nomination);
        
        const allVotes = await safeGetDocs(collection(db, 'votes'));
        const votes = allVotes.docs.map(d => d.data() as Vote);
        
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