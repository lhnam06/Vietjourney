const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
export type PlaceCategory = "FOOD" | "DRINK" | "ACTIVITY" | string;
export type PlaceCategoryFilter = "FOOD" | "DRINK" | "ACTIVITY";

export interface Place {
  id: string;
  name: string;
  address?: string | null;
  category?: PlaceCategory | null;
  district?: string | null;
  images?: string[] | null;
  tags?: Record<string, string[]> | null;
  rating?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface PlaceFilterRequest {
  category?: "food" | "drink" | "activity";
  district?: string;
  tags?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  size?: number;
}

export interface DistrictSummary {
  name: string;
  count: number;
}

export async function fetchPlaces(
  request: PlaceFilterRequest = {},
  signal?: AbortSignal,
) {
  const response = await fetch(_getApiBase() + "/api/v1/places/filter", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page: 0,
      size: 80,
      ...request,
    }),
  });

  if (!response.ok) {
    throw new Error(`Không tải được địa điểm (${response.status})`);
  }

  const payload = (await response.json()) as ApiResponse<PageResponse<Place>>;
  return payload.result;
}

export async function fetchDistricts(
  request: PlaceFilterRequest = {},
  signal?: AbortSignal,
) {
  const response = await fetch(_getApiBase() + "/api/v1/places/districts", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Không tải được danh sách khu vực (${response.status})`);
  }

  const payload = (await response.json()) as ApiResponse<DistrictSummary[]>;
  return payload.result;
}

export function categoryLabel(category?: PlaceCategory | null) {
  switch (category) {
    case "FOOD":
      return "Ẩm thực";
    case "DRINK":
      return "Đồ uống";
    case "ACTIVITY":
      return "Trải nghiệm";
    default:
      return category || "Địa điểm";
  }
}

const tagGroupLabels: Record<PlaceCategoryFilter, Record<string, string>> = {
  FOOD: {
    sub_category: "Nhóm món ăn",
    purpose: "Phù hợp cho",
    service_style: "Kiểu phục vụ",
    amenity: "Tiện ích",
  },
  DRINK: {
    sub_category: "Nhóm đồ uống",
    purpose: "Phù hợp cho",
    vibe: "Không khí",
    amenity: "Tiện ích",
  },
  ACTIVITY: {
    sub_category: "Nhóm trải nghiệm",
    purpose: "Phù hợp cho",
    amenity: "Tiện ích",
  },
};

const tagLabels: Record<string, string> = {
  "24/7": "Mở cửa 24/7",
  ac: "Máy lạnh",
  alcoholic: "Đồ có cồn",
  buffet: "Buffet",
  canteen: "Căn tin",
  casual_dining: "Ăn uống thoải mái",
  celebration: "Tiệc / kỷ niệm",
  checkin_photography: "Check-in / chụp ảnh",
  cinema_show: "Phim / biểu diễn",
  coffee: "Cà phê",
  cultural_space: "Không gian văn hóa",
  dating: "Hẹn hò",
  dessert: "Tráng miệng",
  family: "Gia đình",
  fast_food: "Đồ ăn nhanh",
  group_gathering: "Tụ họp nhóm",
  healthy: "Lành mạnh",
  hotpot: "Lẩu",
  juice_smoothie: "Nước ép / sinh tố",
  luxury: "Cao cấp",
  main_course: "Món chính",
  outdoor: "Ngoài trời",
  parking: "Bãi đỗ xe",
  pet: "Thú cưng",
  photography: "Chụp ảnh",
  private_room: "Phòng riêng",
  quiet: "Yên tĩnh",
  relax: "Thư giãn",
  restroom: "Nhà vệ sinh",
  shopping: "Mua sắm",
  sports_fitness: "Thể thao / fitness",
  street_food: "Ẩm thực đường phố",
  takeaway: "Mang đi",
  tea_milktea: "Trà / trà sữa",
  traditional: "Truyền thống",
  vegetarian: "Món chay",
  vibrant: "Sôi động",
  view: "Có view đẹp",
  wifi: "Wifi",
  work_study: "Làm việc / học tập",
  workshop: "Workshop",
};

export const tagOptionsByCategory: Record<PlaceCategoryFilter, { group: string; values: string[] }[]> = {
  FOOD: [
    { group: "sub_category", values: ["healthy", "main_course", "hotpot", "vegetarian", "buffet", "fast_food"] },
    { group: "purpose", values: ["celebration", "dating", "family", "checkin_photography", "group_gathering"] },
    { group: "service_style", values: ["street_food", "takeaway", "casual_dining", "canteen"] },
    { group: "amenity", values: ["restroom", "ac", "wifi", "private_room"] },
  ],
  DRINK: [
    { group: "sub_category", values: ["coffee", "tea_milktea", "juice_smoothie", "alcoholic", "dessert"] },
    { group: "purpose", values: ["work_study", "dating", "family", "checkin_photography", "group_gathering"] },
    { group: "vibe", values: ["quiet", "vibrant", "outdoor", "view", "traditional", "luxury"] },
    { group: "amenity", values: ["24/7", "ac", "wifi", "private_room", "pet"] },
  ],
  ACTIVITY: [
    { group: "sub_category", values: ["workshop", "sports_fitness", "cultural_space", "outdoor", "cinema_show", "shopping"] },
    { group: "purpose", values: ["dating", "relax", "photography", "group_gathering"] },
    { group: "amenity", values: ["parking", "restroom", "wifi"] },
  ],
};

export function tagGroupLabel(group: string, category?: PlaceCategoryFilter | string) {
  const normalizedCategory = normalizeCategory(category);
  return tagGroupLabels[normalizedCategory]?.[group] || humanizeTag(group);
}

export function tagLabel(tag: string) {
  return tagLabels[tag] || humanizeTag(tag);
}

function humanizeTag(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function categoryFilter(category: string) {
  switch (category) {
    case "FOOD":
      return "food";
    case "DRINK":
      return "drink";
    case "ACTIVITY":
      return "activity";
    default:
      return undefined;
  }
}

export function normalizeCategory(category?: string | null): PlaceCategoryFilter {
  if (category === "DRINK") return "DRINK";
  if (category === "ACTIVITY") return "ACTIVITY";
  return "FOOD";
}

export function tagOptionsForCategory(category?: string | null) {
  return tagOptionsByCategory[normalizeCategory(category)];
}

export function formatPrice(place: Place) {
  const minPrice = place.minPrice;
  const maxPrice = place.maxPrice;

  if (minPrice == null && maxPrice == null) {
    return "Chưa có giá";
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  if (minPrice != null && maxPrice != null) {
    if (minPrice === 0 && maxPrice === 0) {
      return "Miễn phí";
    }

    if (minPrice === maxPrice) {
      return formatCurrency(minPrice);
    }

    return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
  }

  if (minPrice != null) {
    return `Từ ${formatCurrency(minPrice)}`;
  }

  return `Đến ${formatCurrency(maxPrice ?? 0)}`;
}

export function compactPrice(place: Place) {
  if (place.minPrice == null && place.maxPrice == null) {
    return "Chưa có giá";
  }

  const compact = (value: number) =>
    value >= 1000000 ? `${value / 1000000}tr` : `${Math.round(value / 1000)}k`;

  if (place.minPrice != null && place.maxPrice != null) {
    if (place.minPrice === 0 && place.maxPrice === 0) {
      return "Miễn phí";
    }

    if (Math.abs(place.minPrice - place.maxPrice) <= 1000) {
      return `${compact(place.minPrice)}/người`;
    }

    return `${compact(place.minPrice)} - ${compact(place.maxPrice)}`;
  }

  if (place.minPrice != null) {
    return `Từ ${compact(place.minPrice)}`;
  }

  return `Đến ${compact(place.maxPrice ?? 0)}`;
}

export function placeImage(place: Place) {
  return place.images?.find(Boolean) || "/placeholder.svg";
}

export function placeTags(place: Place, limit = 3) {
  const tagValues = Object.values(place.tags || {}).flat().filter(Boolean);
  const labels = tagValues.length ? tagValues : [categoryLabel(place.category)];

  return labels.slice(0, limit).map(tagLabel);
}
