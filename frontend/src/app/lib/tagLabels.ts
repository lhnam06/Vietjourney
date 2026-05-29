export type TagLocale = 'vi' | 'en';

const TAG_GROUP_LABELS: Record<TagLocale, Record<string, string>> = {
  vi: {
    purpose: 'Mục đích',
    amenity: 'Tiện ích',
    service_style: 'Phong cách phục vụ',
    sub_category: 'Phân loại',
    vibe: 'Không khí',
    cuisine: 'Ẩm thực',
    price_level: 'Mức giá',
  },
  en: {
    purpose: 'Purpose',
    amenity: 'Amenities',
    service_style: 'Service style',
    sub_category: 'Category',
    vibe: 'Vibe',
    cuisine: 'Cuisine',
    price_level: 'Price level',
  },
};

const TAG_VALUE_LABELS: Record<TagLocale, Record<string, string>> = {
  vi: {
    celebration: 'Ăn mừng / lễ hội',
    dating: 'Hẹn hò',
    family: 'Gia đình',
    checkin_photography: 'Check-in & chụp ảnh',
    group_gathering: 'Tụ tập nhóm',
    work_study: 'Làm việc & học tập',
    relax: 'Thư giãn',
    photography: 'Chụp ảnh',
    healthy: 'Healthy',
    main_course: 'Món chính',
    hotpot: 'Lẩu',
    vegetarian: 'Chay',
    buffet: 'Buffet',
    fast_food: 'Fast food',
    coffee: 'Cà phê',
    tea_milktea: 'Trà / trà sữa',
    juice_smoothie: 'Nước ép / smoothie',
    alcoholic: 'Có cồn',
    dessert: 'Tráng miệng',
    workshop: 'Workshop',
    sports_fitness: 'Thể thao & fitness',
    cultural_space: 'Không gian văn hóa',
    outdoor: 'Ngoài trời',
    cinema_show: 'Rạp / show',
    shopping: 'Mua sắm',
    street_food: 'Ăn vặt / street food',
    takeaway: 'Mang đi',
    casual_dining: 'Ăn thường',
    canteen: 'Căng tin',
    restroom: 'Nhà vệ sinh',
    ac: 'Máy lạnh',
    wifi: 'Wi-Fi',
    private_room: 'Phòng riêng',
    quiet: 'Yên tĩnh',
    vibrant: 'Sôi động',
    view: 'View đẹp',
    traditional: 'Truyền thống',
    luxury: 'Cao cấp',
    '24/7': 'Mở 24/7',
    pet: 'Thú cưng',
    parking: 'Bãi đỗ xe',
  },
  en: {
    celebration: 'Celebration',
    dating: 'Dating',
    family: 'Family',
    checkin_photography: 'Check-in & photos',
    group_gathering: 'Group gathering',
    work_study: 'Work & study',
    relax: 'Relax',
    photography: 'Photography',
    healthy: 'Healthy',
    main_course: 'Main course',
    hotpot: 'Hot pot',
    vegetarian: 'Vegetarian',
    buffet: 'Buffet',
    fast_food: 'Fast food',
    coffee: 'Coffee',
    tea_milktea: 'Tea / milk tea',
    juice_smoothie: 'Juice / smoothie',
    alcoholic: 'Alcoholic',
    dessert: 'Dessert',
    workshop: 'Workshop',
    sports_fitness: 'Sports & fitness',
    cultural_space: 'Cultural space',
    outdoor: 'Outdoor',
    cinema_show: 'Cinema / show',
    shopping: 'Shopping',
    street_food: 'Street food',
    takeaway: 'Takeaway',
    casual_dining: 'Casual dining',
    canteen: 'Canteen',
    restroom: 'Restroom',
    ac: 'Air conditioning',
    wifi: 'Wi-Fi',
    private_room: 'Private room',
    quiet: 'Quiet',
    vibrant: 'Vibrant',
    view: 'Scenic view',
    traditional: 'Traditional',
    luxury: 'Luxury',
    '24/7': 'Open 24/7',
    pet: 'Pet friendly',
    parking: 'Parking',
  },
};

export function resolveTagLocale(): TagLocale {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('vi')) {
    return 'vi';
  }
  return 'en';
}

export function humanizeToken(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

export function tagGroupLabel(group: string, locale: TagLocale = resolveTagLocale()): string {
  const key = (group || '').trim().toLowerCase();
  return TAG_GROUP_LABELS[locale][key] ?? humanizeToken(group);
}

export function tagValueLabel(value: string, locale: TagLocale = resolveTagLocale()): string {
  const key = (value || '').trim().toLowerCase();
  return TAG_VALUE_LABELS[locale][key] ?? humanizeToken(value);
}
