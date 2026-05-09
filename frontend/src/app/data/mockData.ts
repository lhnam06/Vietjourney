// Mock data for Vietnam travel planning app

export interface Location {
  id: string;
  name: string;
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
  duration: number; // in minutes
  /** Present for server-backed places — used when recording recommendation interactions */
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
    pace: number; // 1-5
    budgetLevel: number; // 1-3
    favoriteCategories: string[];
  };
}

export const mockLocations: Location[] = [
  {
    id: 'loc-1',
    name: 'Phở Phú Vương — Sáng nhẹ',
    description: 'Phở tái nạm sáng cuối tuần — khu quen của dân quận trung tâm',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80',
    lat: 10.7723,
    lng: 106.6977,
    price: 55000,
    rating: 4.6,
    tags: ['Ẩm Thực', 'Phở', 'Bữa Sáng'],
    weather: 'indoor',
    vibe: 'moderate',
    budget: '$',
    duration: 45,
  },
  {
    id: 'loc-2',
    name: 'Chợ Bến Thành',
    description: 'Ngã tư ẩm thực và quà lưu niệm của Sài Gòn',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
    lat: 10.772,
    lng: 106.6983,
    price: 0,
    rating: 4.5,
    tags: ['Chợ', 'Mua Sắm', 'Ẩm Thực'],
    weather: 'both',
    vibe: 'vibrant',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-3',
    name: 'Bún Thịt Nướng Chợ Lớn',
    description: 'Thơm mỡ hành và nước mắm chua ngọt đặc trưng Nam Bộ',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    lat: 10.7542,
    lng: 106.6684,
    price: 65000,
    rating: 4.7,
    tags: ['Ẩm Thực', 'Đường Phố', 'Trưa'],
    weather: 'indoor',
    vibe: 'vibrant',
    budget: '$',
    duration: 50,
  },
  {
    id: 'loc-4',
    name: 'Cà phê sân thượng Pasteur',
    description: 'Ngắm nhịp phố Sài Gòn từ trên cao với cold brew',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    lat: 10.7801,
    lng: 106.6965,
    price: 55000,
    rating: 4.5,
    tags: ['Cà Phê', 'Sân Thượng', 'Nghỉ Giữa Chiều'],
    weather: 'outdoor',
    vibe: 'moderate',
    budget: '$',
    duration: 60,
  },
  {
    id: 'loc-5',
    name: 'Phố đi bộ Nguyễn Huệ',
    description: 'Quảng trường đi bộ, nhạc nước cuối tuần và view Bitexco',
    image: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=800&q=80',
    lat: 10.7756,
    lng: 106.7039,
    price: 0,
    rating: 4.7,
    tags: ['Đi Bộ', 'Check-in', 'Tối'],
    weather: 'outdoor',
    vibe: 'vibrant',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-6',
    name: 'Nhà thờ Đức Bà',
    description: 'Biểu tượng kiến trúc Sài Gòn thời thuộc Pháp',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
    lat: 10.7797,
    lng: 106.699,
    price: 0,
    rating: 4.8,
    tags: ['Di Tích', 'Kiến Trúc', 'Lịch Sử'],
    weather: 'outdoor',
    vibe: 'quiet',
    budget: '$',
    duration: 45,
  },
  {
    id: 'loc-7',
    name: 'Nhà hát Thành phố',
    description: 'Kiến trúc cổ điển gần đường Lê Lợi',
    image: 'https://images.unsplash.com/photo-1580041065738-e72023775cdc?w=800&q=80',
    lat: 10.7765,
    lng: 106.7035,
    price: 150000,
    rating: 4.6,
    tags: ['Kiến Trúc', 'Biểu Diễn', 'Văn Hóa'],
    weather: 'indoor',
    vibe: 'quiet',
    budget: '$$',
    duration: 120,
  },
  {
    id: 'loc-8',
    name: 'Bảo tàng Chứng tích Chiến tranh',
    description: 'Không gian lịch sử hiện đại ở Quận 3',
    image: 'https://images.unsplash.com/photo-1577720643272-265f09367432?w=800&q=80',
    lat: 10.7793,
    lng: 106.6921,
    price: 40000,
    rating: 4.7,
    tags: ['Bảo Tàng', 'Lịch Sử', 'Học Hỏi'],
    weather: 'indoor',
    vibe: 'quiet',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-9',
    name: 'Thức ăn đường phố Hoàng Diệu',
    description: 'Bánh tráng nướng, ốc và món ăn khuya',
    image: 'https://images.unsplash.com/photo-1604797332671-e601c4f89f91?w=800&q=80',
    lat: 10.7872,
    lng: 106.7053,
    price: 85000,
    rating: 4.5,
    tags: ['Ẩm Thực', 'Đêm', 'Đường Phố'],
    weather: 'outdoor',
    vibe: 'vibrant',
    budget: '$$',
    duration: 75,
  },
  {
    id: 'loc-10',
    name: 'Dinh Độc Lập',
    description: 'Di tích lịch sử và kiến trúc công sở Sài Gòn xưa',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
    lat: 10.7773,
    lng: 106.6964,
    price: 40000,
    rating: 4.8,
    tags: ['Di Tích', 'Lịch Sử', 'Tham Quan'],
    weather: 'both',
    vibe: 'moderate',
    budget: '$',
    duration: 75,
  },
];

export const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    name: 'Sài Gòn — một ngày ăn và đi',
    destination: 'TP. Hồ Chí Minh, Việt Nam',
    coverImage: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
    startDate: '2026-05-15',
    endDate: '2026-05-20',
    participants: ['user-1', 'user-2', 'user-3'],
    totalBudget: 12000000,
  },
  {
    id: 'trip-2',
    name: 'Hội An Cổ Kính',
    destination: 'Hội An, Việt Nam',
    coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80',
    startDate: '2026-03-10',
    endDate: '2026-03-17',
    participants: ['user-1', 'user-4'],
    totalBudget: 15000000,
  },
  {
    id: 'trip-3',
    name: 'Phú Quốc Biển Xanh',
    destination: 'Phú Quốc, Việt Nam',
    coverImage: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
    startDate: '2025-12-05',
    endDate: '2025-12-10',
    participants: ['user-1', 'user-2'],
    totalBudget: 18000000,
  },
];

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    preferences: {
      pace: 3,
      budgetLevel: 2,
      favoriteCategories: ['Ẩm Thực', 'Văn Hóa', 'Lịch Sử'],
    },
  },
  {
    id: 'user-2',
    name: 'Trần Quốc Hưng',
    email: 'quochung@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    preferences: {
      pace: 4,
      budgetLevel: 2,
      favoriteCategories: ['Phiêu Lưu', 'Thiên Nhiên', 'Nhiếp Ảnh'],
    },
  },
  {
    id: 'user-3',
    name: 'Lê Thu Hà',
    email: 'thuha@example.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
    preferences: {
      pace: 2,
      budgetLevel: 3,
      favoriteCategories: ['Nghỉ Dưỡng', 'Spa', 'Ẩm Thực'],
    },
  },
  {
    id: 'user-4',
    name: 'Phạm Đức Nam',
    email: 'ducnam@example.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    preferences: {
      pace: 5,
      budgetLevel: 1,
      favoriteCategories: ['Khám Phá', 'Lịch Sử', 'Địa Phương'],
    },
  },
];

export const mockTimeline: TimelineItem[] = [
  {
    id: 'timeline-1',
    locationId: 'loc-1',
    startTime: '07:00',
    endTime: '08:00',
    date: '2026-05-15',
  },
  {
    id: 'timeline-2',
    locationId: 'loc-2',
    startTime: '09:00',
    endTime: '10:30',
    date: '2026-05-15',
  },
  {
    id: 'timeline-3',
    locationId: 'loc-3',
    startTime: '12:00',
    endTime: '13:00',
    date: '2026-05-15',
  },
  {
    id: 'timeline-4',
    locationId: 'loc-4',
    startTime: '15:00',
    endTime: '16:00',
    date: '2026-05-15',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'trans-1',
    description: 'Ăn sáng — phở quận 1',
    amount: 150000,
    paidBy: 'user-1',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    linkedActivity: 'timeline-1',
    date: '2026-05-15',
  },
  {
    id: 'trans-2',
    description: 'Chợ Bến Thành — đồ ăn và quà',
    amount: 90000,
    paidBy: 'user-2',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Hoạt Động',
    linkedActivity: 'timeline-2',
    date: '2026-05-15',
  },
  {
    id: 'trans-3',
    description: 'Bún thịt nướng Chợ Lớn',
    amount: 360000,
    paidBy: 'user-3',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    linkedActivity: 'timeline-3',
    date: '2026-05-15',
  },
  {
    id: 'trans-4',
    description: 'Khách Sạn - Đêm 1',
    amount: 1200000,
    paidBy: 'user-1',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Lưu Trú',
    date: '2026-05-15',
  },
  {
    id: 'trans-5',
    description: 'Cà phê sân thượng Pasteur',
    amount: 105000,
    paidBy: 'user-2',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    linkedActivity: 'timeline-4',
    date: '2026-05-15',
  },
  {
    id: 'trans-6',
    description: 'Ăn tối chợ đêm / street food TP.HCM',
    amount: 270000,
    paidBy: 'user-3',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    date: '2026-05-15',
  },
];

// Calculate debt settlement
export function calculateDebtSettlement(transactions: Transaction[], users: User[]) {
  const balances: { [userId: string]: number } = {};
  
  users.forEach(user => {
    balances[user.id] = 0;
  });

  transactions.forEach(transaction => {
    const splitAmount = transaction.amount / transaction.splitAmong.length;
    
    // Person who paid gets credited
    balances[transaction.paidBy] += transaction.amount;
    
    // Everyone who is splitting gets debited
    transaction.splitAmong.forEach(userId => {
      balances[userId] -= splitAmount;
    });
  });

  return balances;
}