export interface Location {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  lat: number;
  lng: number;
  price: number;
  rating: number;
  tags: string[];
  weather: 'indoor' | 'outdoor' | 'both';
  vibe: 'quiet' | 'vibrant' | 'moderate';
  budget: '$' | '$$' | '$$$';
  duration: number;
  isPending?: boolean;
  authorUsername?: string;
  recommendation?: {
    category: string;
    district?: string;
    tags?: Record<string, string[]>;
  };
}

export interface TimelineItem {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  date: string;
  notes?: string;
  editedBy?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  participants: string[];
  totalBudget: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  category: string;
  linkedActivity?: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  preferences: {
    pace: number;
    budgetLevel: number;
    favoriteCategories: string[];
  };
}

export const DEFAULT_USER_PREFERENCES: User['preferences'] = {
  pace: 3,
  budgetLevel: 2,
  favoriteCategories: [],
};

/** Legacy sentinel id still referenced in localStorage for unauthenticated/demo flows. */
export const LEGACY_DEMO_TRIP_ID = 'trip-1';

export function displayTripDestination(destination?: string | null): string {
  const value = (destination || '').trim();
  if (!value || value === 'Trip created from My Trip') return 'Việt Nam';
  return value;
}

export function createDefaultTrip(tripId: string, overrides: Partial<Trip> = {}): Trip {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 4);
  return {
    id: tripId,
    name: 'Chuyến đi',
    destination: 'Việt Nam',
    coverImage: '',
    startDate: today.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    participants: [],
    totalBudget: 0,
    ...overrides,
  };
}

export function calculateDebtSettlement(transactions: Transaction[], users: User[]) {
  const balances: Record<string, number> = {};
  users.forEach((user) => {
    balances[user.id] = 0;
  });

  transactions.forEach((transaction) => {
    const splitAmount = transaction.amount / transaction.splitAmong.length;
    balances[transaction.paidBy] = (balances[transaction.paidBy] ?? 0) + transaction.amount;
    transaction.splitAmong.forEach((userId) => {
      balances[userId] = (balances[userId] ?? 0) - splitAmount;
    });
  });

  return balances;
}
