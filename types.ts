export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
  avatar?: string;
  status: UserStatus;
}

export enum CycleStatus {
  NOMINATION = 'NOMINATION', // Users can nominate
  VOTING = 'VOTING',         // Users can vote
  CLOSED = 'CLOSED'          // Read-only results
}

export interface Cycle {
  id: string;
  month: number; // 0-11
  year: number;
  status: CycleStatus;
  winnerId?: string;
}

export interface Nomination {
  id: string;
  nominatorId: string;
  nomineeId: string;
  cycleId: string;
  reason: string;
  timestamp: number;
}

export interface Vote {
  id: string;
  voterId: string;
  nomineeId: string;
  cycleId: string;
  timestamp: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface CycleStats {
  nomineeId: string;
  nomineeName: string;
  nominationCount: number;
  voteCount: number;
}