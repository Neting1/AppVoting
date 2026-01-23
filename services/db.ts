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
  getCountFromServer
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

  // Used for registering a new user linked to Firebase Auth UID
  createUserProfile: async (uid: string, user: Omit<User, 'id' | 'status'>): Promise<void> => {
    let role = user.role;

    // Check if this is the first user ever
    // Wrapped in try-catch because security rules often block 'count'/'list' operations for new non-admin users.
    // If we can't count, we default to the requested role (usually EMPLOYEE), effectively skipping the auto-admin check
    // if permissions aren't set up to allow it for public/new users.
    try {
      const coll = collection(db, 'users');
      const snapshot = await getCountFromServer(coll);
      const isFirstUser = snapshot.data().count === 0;
      if (isFirstUser) {
        role = UserRole.ADMIN;
      }
    } catch (error) {
      console.warn("Skipping 'First User is Admin' check due to insufficient permissions:", error);
      // Proceed with default role
    }

    const newUserRef = doc(db, 'users', uid);
    const newUser: User = {
      ...user,
      id: uid,
      role: role,
      status: 'ACTIVE'
    };
    
    // Remove password from Firestore storage if it exists in the object
    if ('password' in newUser) {
      delete newUser.password;
    }

    await setDoc(newUserRef, newUser);
  },

  // Kept for backward compatibility/admin usage, but updated logic
  addUser: async (user: Omit<User, 'id' | 'status'>): Promise<void> => {
    // This method generates an ID automatically. 
    // Mainly used by Admin to add employees without them self-registering yet (shadow accounts).
    
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
    
    // Remove password
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
    const snapshot = await getDocs(collection(db, 'cycles'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
  },

  getActiveCycle: async (): Promise<Cycle | undefined> => {
    const cyclesRef = collection(db, 'cycles');
    const snapshot = await getDocs(cyclesRef);
    const cycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
    
    return cycles.find(c => c.status !== CycleStatus.CLOSED) || cycles.sort((a,b) => b.year - a.year || b.month - a.month)[0];
  },

  createCycle: async (month: number, year: number): Promise<Cycle> => {
    const batch = writeBatch(db);
    
    const cyclesRef = collection(db, 'cycles');
    const snapshot = await getDocs(cyclesRef);
    snapshot.docs.forEach((doc) => {
      if (doc.data().status !== CycleStatus.CLOSED) {
        batch.update(doc.ref, { status: CycleStatus.CLOSED });
      }
    });

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
    const nominations = await dbService.getNominations(cycleId);
    const votes = await dbService.getVotes(cycleId);
    const employees = await dbService.getUsers();

    const statsMap = new Map<string, CycleStats>();

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