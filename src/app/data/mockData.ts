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
    name: 'Ăn Sáng (Phở Thìn)',
    description: 'Phở bò Hà Nội nóng hổi, chuẩn vị buổi sáng',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80',
    lat: 21.0285,
    lng: 105.8542,
    price: 50000,
    rating: 4.7,
    tags: ['Ẩm Thực', 'Phở', 'Bữa Sáng'],
    weather: 'indoor',
    vibe: 'vibrant',
    budget: '$',
    duration: 45,
  },
  {
    id: 'loc-2',
    name: 'Tham Quan Văn Miếu',
    description: 'Văn Miếu – Quốc Tử Giám, không gian văn hoá & lịch sử',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
    lat: 21.0277,
    lng: 105.8355,
    price: 30000,
    rating: 4.8,
    tags: ['Lịch Sử', 'Văn Hóa', 'Di Tích'],
    weather: 'outdoor',
    vibe: 'quiet',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-3',
    name: 'Ăn Trưa (Chả Cá Lã Vọng)',
    description: 'Đặc sản chả cá trứ danh – ăn kèm bún, lạc, thì là',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    lat: 21.0318,
    lng: 105.8516,
    price: 120000,
    rating: 4.6,
    tags: ['Ẩm Thực', 'Đặc Sản', 'Bữa Trưa'],
    weather: 'indoor',
    vibe: 'moderate',
    budget: '$$',
    duration: 60,
  },
  {
    id: 'loc-4',
    name: 'Cà Phê Đường Tàu',
    description: 'Trải nghiệm cà phê sát đường ray – check-in nổi tiếng Hà Nội',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    lat: 21.0245,
    lng: 105.8412,
    price: 35000,
    rating: 4.5,
    tags: ['Cà Phê', 'Instagram', 'Độc Đáo'],
    weather: 'outdoor',
    vibe: 'vibrant',
    budget: '$',
    duration: 60,
  },
  {
    id: 'loc-5',
    name: 'Hồ Hoàn Kiếm',
    description: 'Trung tâm Hà Nội với Tháp Rùa và Đền Ngọc Sơn',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80',
    lat: 21.0285,
    lng: 105.8542,
    price: 0,
    rating: 4.7,
    tags: ['Hồ', 'Công Viên', 'Đền Thờ'],
    weather: 'outdoor',
    vibe: 'moderate',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-6',
    name: 'Phố Cổ Hà Nội',
    description: 'Khu phố cổ với 36 phố phường truyền thống',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
    lat: 21.0330,
    lng: 105.8530,
    price: 0,
    rating: 4.8,
    tags: ['Phố Cổ', 'Mua Sắm', 'Văn Hóa'],
    weather: 'outdoor',
    vibe: 'vibrant',
    budget: '$$',
    duration: 120,
  },
  {
    id: 'loc-7',
    name: 'Nhà Hát Lớn Hà Nội',
    description: 'Công trình kiến trúc Pháp cổ điển',
    image: 'https://images.unsplash.com/photo-1580041065738-e72023775cdc?w=800&q=80',
    lat: 21.0236,
    lng: 105.8570,
    price: 200000,
    rating: 4.6,
    tags: ['Kiến Trúc', 'Nghệ Thuật', 'Biểu Diễn'],
    weather: 'indoor',
    vibe: 'quiet',
    budget: '$$',
    duration: 120,
  },
  {
    id: 'loc-8',
    name: 'Chợ Đồng Xuân',
    description: 'Chợ truyền thống lớn nhất Hà Nội',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
    lat: 21.0367,
    lng: 105.8485,
    price: 0,
    rating: 4.4,
    tags: ['Chợ', 'Mua Sắm', 'Ẩm Thực'],
    weather: 'both',
    vibe: 'vibrant',
    budget: '$',
    duration: 90,
  },
  {
    id: 'loc-9',
    name: 'Bánh Mì Bà Phượng',
    description: 'Bánh mì giòn rụm, phù hợp ghé nhanh giữa lịch trình',
    image: 'https://images.unsplash.com/photo-1604797332671-e601c4f89f91?w=800&q=80',
    lat: 21.0452,
    lng: 105.8302,
    price: 25000,
    rating: 4.7,
    tags: ['Ẩm Thực', 'Bánh Mì', 'Đường Phố'],
    weather: 'outdoor',
    vibe: 'vibrant',
    budget: '$',
    duration: 30,
  },
  {
    id: 'loc-10',
    name: 'Lăng Chủ Tịch Hồ Chí Minh',
    description: 'Lăng tưởng niệm Chủ tịch Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
    lat: 21.0365,
    lng: 105.8345,
    price: 0,
    rating: 4.8,
    tags: ['Lịch Sử', 'Di Tích', 'Văn Hóa'],
    weather: 'outdoor',
    vibe: 'quiet',
    budget: '$',
    duration: 60,
  },
];

export const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    name: 'Khám Phá Hà Nội',
    destination: 'Hà Nội, Việt Nam',
    coverImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80',
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
    description: 'Ăn sáng Phở Thìn',
    amount: 150000,
    paidBy: 'user-1',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    linkedActivity: 'timeline-1',
    date: '2026-05-15',
  },
  {
    id: 'trans-2',
    description: 'Vé Văn Miếu',
    amount: 90000,
    paidBy: 'user-2',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Hoạt Động',
    linkedActivity: 'timeline-2',
    date: '2026-05-15',
  },
  {
    id: 'trans-3',
    description: 'Ăn trưa Chả Cá',
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
    description: 'Cà phê Đường Tàu',
    amount: 105000,
    paidBy: 'user-2',
    splitAmong: ['user-1', 'user-2', 'user-3'],
    category: 'Ẩm Thực',
    linkedActivity: 'timeline-4',
    date: '2026-05-15',
  },
  {
    id: 'trans-6',
    description: 'Ăn tối Bún Chả Hàng Mành',
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