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
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { User, UserRole, Cycle, CycleStatus, Nomination, Vote, CycleStats } from '../types';

// Database Service with Firestore
export const dbService = {
  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },
  
  getUserById: async (id: string): Promise<User | undefined> => {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return undefined;
  },

  getEmployees: async (): Promise<User[]> => {
    const q = query(collection(db, 'users'), where("role", "==", UserRole.EMPLOYEE));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  addUser: async (user: Omit<User, 'id' | 'status'>): Promise<void> => {
    // Check for existing email
    const q = query(collection(db, 'users'), where("email", "==", user.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("User with this email already exists");
    }

    const newUserRef = doc(collection(db, 'users'));
    const newUser: User = {
      ...user,
      id: newUserRef.id,
      status: 'ACTIVE'
    };
    await setDoc(newUserRef, newUser);
  },

  updateUser: async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, { ...user });
  },

  getCycles: async (): Promise<Cycle[]> => {
    const snapshot = await getDocs(collection(db, 'cycles'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
  },

  getActiveCycle: async (): Promise<Cycle | undefined> => {
    // Look for any cycle that is not closed
    const cyclesRef = collection(db, 'cycles');
    const snapshot = await getDocs(cyclesRef);
    const cycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
    
    // Logic: Return the one that isn't closed, or the most recent one
    return cycles.find(c => c.status !== CycleStatus.CLOSED) || cycles.sort((a,b) => b.year - a.year || b.month - a.month)[0];
  },

  createCycle: async (month: number, year: number): Promise<Cycle> => {
    const batch = writeBatch(db);
    
    // Close all other cycles
    const cyclesRef = collection(db, 'cycles');
    const snapshot = await getDocs(cyclesRef);
    snapshot.docs.forEach((doc) => {
      if (doc.data().status !== CycleStatus.CLOSED) {
        batch.update(doc.ref, { status: CycleStatus.CLOSED });
      }
    });

    // Create new cycle
    const newCycleRef = doc(collection(db, 'cycles'));
    const newCycle: Cycle = {
      id: newCycleRef.id,
      month,
      year,
      status: CycleStatus.NOMINATION
    };
    batch.set(newCycleRef, newCycle);

    await batch.commit();
    return newCycle;
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
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nomination));
  },

  getUserNomination: async (userId: string, cycleId: string): Promise<Nomination | undefined> => {
    const q = query(
      collection(db, 'nominations'), 
      where("nominatorId", "==", userId),
      where("cycleId", "==", cycleId)
    );
    const snapshot = await getDocs(q);
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

    const newNomRef = doc(collection(db, 'nominations'));
    const newNomination: Nomination = {
      id: newNomRef.id,
      nominatorId,
      nomineeId,
      cycleId,
      reason,
      timestamp: Date.now()
    };
    await setDoc(newNomRef, newNomination);
  },

  getVotes: async (cycleId: string): Promise<Vote[]> => {
    const q = query(collection(db, 'votes'), where("cycleId", "==", cycleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
  },

  getUserVote: async (userId: string, cycleId: string): Promise<Vote | undefined> => {
    const q = query(
      collection(db, 'votes'), 
      where("voterId", "==", userId),
      where("cycleId", "==", cycleId)
    );
    const snapshot = await getDocs(q);
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

    const newVoteRef = doc(collection(db, 'votes'));
    const newVote: Vote = {
      id: newVoteRef.id,
      voterId,
      nomineeId,
      cycleId,
      timestamp: Date.now()
    };
    await setDoc(newVoteRef, newVote);
  },

  getCycleStats: async (cycleId: string): Promise<CycleStats[]> => {
    // Firestore joins are manual
    const nominations = await dbService.getNominations(cycleId);
    const votes = await dbService.getVotes(cycleId);
    const employees = await dbService.getUsers(); // Fetch all users to map names

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

  getEmployeeHistory: async (userId: string) => {
    // Manual join of cycles, nominations, and votes for a specific user
    const cycles = await dbService.getCycles();
    const allNominations = await getDocs(collection(db, 'nominations'));
    const nominations = allNominations.docs.map(d => d.data() as Nomination);
    
    const allVotes = await getDocs(collection(db, 'votes'));
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
  }
};