export type PlaceCategory = "FOOD" | "DRINK" | "ACTIVITY" | string;

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

export async function fetchPlaces(
  request: PlaceFilterRequest = {},
  signal?: AbortSignal,
) {
  const response = await fetch("/api/v1/places/filter", {
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

const tagGroupLabels: Record<string, string> = {
  sub_category: "Loại món / hoạt động",
  purpose: "Mục đích",
  service_style: "Phong cách phục vụ",
  vibe: "Không khí",
  amenity: "Tiện ích",
};

const tagLabels: Record<string, string> = {
  buffet: "Buffet",
  canteen: "Căn tin",
  casual_dining: "Ăn uống thoải mái",
  celebration: "Tiệc / kỷ niệm",
  dating: "Hẹn hò",
  family: "Gia đình",
  fast_food: "Đồ ăn nhanh",
  group_gathering: "Tụ họp nhóm",
  healthy: "Lành mạnh",
  hotpot: "Lẩu",
  main_course: "Món chính",
  private_room: "Phòng riêng",
  restroom: "Nhà vệ sinh",
  street_food: "Ẩm thực đường phố",
  takeaway: "Mang đi",
  vegetarian: "Món chay",
  wifi: "Wifi",
};

export function tagGroupLabel(group: string) {
  return tagGroupLabels[group] || humanizeTag(group);
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
