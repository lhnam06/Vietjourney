import { useState, type ReactNode } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Heart,
  ListFilter,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  type LucideIcon,
  X,
} from "lucide-react";
import {
  categoryLabel,
  compactPrice,
  formatPrice,
  placeImage,
  placeTags,
  tagGroupLabel,
  tagLabel,
  type Place,
} from "../lib/placesApi";
import { cn } from "../lib/utils";

export type ModalType =
  | "area"
  | "filters"
  | "place"
  | "new-list"
  | "active-filters"
  | "sort"
  | "tips"
  | null;

export type PriceFilter = "all" | "under100" | "100to300" | "300to500" | "500to1000" | "over1000";
export type RatingFilter = "all" | "4" | "4.5" | "5";
export type SortOption = "best" | "rating" | "distance" | "priceAsc" | "priceDesc" | "newest";

export interface PlaceFilters {
  district: string;
  category: string;
  price: PriceFilter;
  rating: RatingFilter;
  tags: Record<string, string[]>;
}

export interface TagOptionGroup {
  group: string;
  values: string[];
}

const priceOptions: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "under100", label: "Dưới 100k" },
  { value: "100to300", label: "100k - 300k" },
  { value: "300to500", label: "300k - 500k" },
  { value: "500to1000", label: "500k - 1 triệu" },
  { value: "over1000", label: "Trên 1 triệu" },
];

const ratingOptions: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
  { value: "5", label: "5.0" },
];

const sortOptions: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: "best", label: "Phù hợp nhất", icon: Sparkles },
  { value: "rating", label: "Đánh giá cao nhất", icon: Star },
  { value: "distance", label: "Khoảng cách gần nhất", icon: Navigation },
  { value: "priceAsc", label: "Giá: Thấp đến cao", icon: ArrowDownWideNarrow },
  { value: "priceDesc", label: "Giá: Cao đến thấp", icon: ArrowUpWideNarrow },
  { value: "newest", label: "Mới nhất", icon: Clock3 },
];

const districtImages: Record<string, string> = {
  "Quận 1": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=180&q=70",
  "Quận 3": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=180&q=70",
  "Quận 4": "https://images.unsplash.com/photo-1606398850524-7058c319a920?auto=format&fit=crop&w=180&q=70",
  "Quận 5": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=180&q=70",
  "Quận 7": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=180&q=70",
  "Quận 10": "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=180&q=70",
  "Bình Thạnh": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=180&q=70",
  "Bình Tân": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=180&q=70",
  "Bình Chánh": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=180&q=70",
  "Tân Bình": "https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=180&q=70",
  "Tân Phú": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=180&q=70",
  "Phú Nhuận": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=180&q=70",
  "Gò Vấp": "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=180&q=70",
  "Thủ Đức": "https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=180&q=70",
  "Nhà Bè": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=180&q=70",
  "Củ Chi": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=180&q=70",
  "Hóc Môn": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=180&q=70",
  "Cần Giờ": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=180&q=70",
};

function districtImage(name: string) {
  return districtImages[name] || `https://picsum.photos/seed/${encodeURIComponent(name)}/180/120`;
}

const listIconOptions = [
  { value: "bookmark", icon: Bookmark },
  { value: "heart", icon: Heart },
  { value: "camera", icon: Camera },
  { value: "coffee", icon: Coffee },
  { value: "map-pin", icon: MapPin },
  { value: "star", icon: Star },
];

function ModalFrame({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-[3px]">
      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          "max-h-[92vh] w-full overflow-hidden rounded-2xl border border-white/70 bg-white text-slate-950 shadow-2xl shadow-slate-950/25",
          className || "max-w-md",
        )}
      >
        <header className="flex items-center justify-between px-5 py-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <X className="size-5" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FooterActions({
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <footer className="flex gap-3 border-t border-slate-100 px-5 py-4">
      <button
        onClick={onCancel}
        className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold transition-colors hover:bg-slate-50"
      >
        Hủy
      </button>
      <button
        onClick={onConfirm}
        className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-indigo-500/20 transition-opacity hover:opacity-90"
      >
        {confirmLabel}
      </button>
    </footer>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-slate-100 text-slate-800 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  );
}

export function AreaModal({
  districts,
  selectedDistrict,
  onSelect,
  onReset,
  onClose,
}: {
  districts: { name: string; count: number; image?: string }[];
  selectedDistrict: string;
  onSelect: (district: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleDistricts = normalizedQuery
    ? districts.filter((district) => district.name.toLowerCase().includes(normalizedQuery))
    : districts;

  return (
    <ModalFrame title="Chọn khu vực" onClose={onClose} className="max-w-md">
      <div className="px-5 pb-4">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500">
          <Search className="size-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm khu vực, quận, thành phố..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {visibleDistricts.map((district) => (
            <button
              key={district.name}
              onClick={() => onSelect(district.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                selectedDistrict === district.name
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-slate-50",
              )}
            >
              <img
                src={district.image || districtImage(district.name)}
                alt={district.name}
                className="size-14 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{district.name}</span>
                <span className="text-sm text-slate-500">
                  {district.count.toLocaleString("vi-VN")} địa điểm
                </span>
              </span>
              {selectedDistrict === district.name ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="size-3.5" />
                </span>
              ) : null}
            </button>
          ))}
          {visibleDistricts.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Không tìm thấy khu vực phù hợp.
            </p>
          ) : null}
        </div>
      </div>
      <footer className="flex gap-3 border-t border-slate-100 px-5 py-4">
        <button
          onClick={onReset}
          className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold transition-colors hover:bg-slate-50"
        >
          Đặt lại
        </button>
        <button
          onClick={onClose}
          className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-indigo-500/20 transition-opacity hover:opacity-90"
        >
          Xác nhận
        </button>
      </footer>
    </ModalFrame>
  );
}

export function FilterModal({
  filters,
  tagOptions,
  onChange,
  onReset,
  onApply,
  onClose,
}: {
  filters: PlaceFilters;
  tagOptions: TagOptionGroup[];
  onChange: (filters: PlaceFilters) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  function toggleTag(group: string, value: string) {
    const currentValues = filters.tags[group] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    const nextTags = { ...filters.tags };

    if (nextValues.length) {
      nextTags[group] = nextValues;
    } else {
      delete nextTags[group];
    }

    onChange({ ...filters, tags: nextTags });
  }

  return (
    <ModalFrame title="Bộ lọc" onClose={onClose} className="max-w-lg">
      <div className="max-h-[calc(92vh-9rem)] space-y-8 overflow-y-auto px-5 pb-5 pr-4">
        <div className="flex justify-end">
          <button onClick={onReset} className="text-sm font-semibold text-primary">
            Đặt lại tất cả
          </button>
        </div>
        <section>
          <h3 className="text-sm font-semibold">Khoảng giá (đ / người)</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {priceOptions.map((option) => (
              <Chip
                key={option.value}
                active={filters.price === option.value}
                onClick={() => onChange({ ...filters, price: option.value })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-semibold">Đánh giá</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {ratingOptions.map((option) => (
              <Chip
                key={option.value}
                active={filters.rating === option.value}
                onClick={() => onChange({ ...filters, rating: option.value })}
              >
                {option.value !== "all" ? <Star className="mr-1 inline size-4 fill-amber-400 text-amber-400" /> : null}
                {option.label}
              </Chip>
            ))}
          </div>
        </section>
        {tagOptions.length ? (
          <section>
            <h3 className="text-sm font-semibold">Tag địa điểm</h3>
            <div className="mt-4 space-y-5">
              {tagOptions.map((optionGroup) => (
                <div key={optionGroup.group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {tagGroupLabel(optionGroup.group, filters.category)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {optionGroup.values.map((value) => (
                      <Chip
                        key={`${optionGroup.group}-${value}`}
                        active={(filters.tags[optionGroup.group] || []).includes(value)}
                        onClick={() => toggleTag(optionGroup.group, value)}
                      >
                        {tagLabel(value)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section>
          <h3 className="text-sm font-semibold">Khoảng cách</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {["Tất cả", "Dưới 1km", "1 - 5km", "5 - 10km", "Trên 10km"].map((label, index) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            API hiện chưa hỗ trợ lọc theo khoảng cách nên nhóm này chỉ hiển thị theo thiết kế.
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold">Có mở cửa lúc tôi đến</h3>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Backend hiện chưa có giờ mở cửa, tùy chọn này chỉ hiển thị trạng thái.
            </p>
            <span className="h-7 w-12 rounded-full bg-slate-300 p-1">
              <span className="block size-5 rounded-full bg-white shadow-sm" />
            </span>
          </div>
        </section>
      </div>
      <FooterActions confirmLabel="Áp dụng" onCancel={onClose} onConfirm={onApply} />
    </ModalFrame>
  );
}

export function PlaceDetailModal({
  place,
  isSaved,
  onAddPlace,
  onClose,
}: {
  place: Place;
  isSaved: boolean;
  onAddPlace: (place: Place) => void;
  onClose: () => void;
}) {
  const tags = placeTags(place);

  return (
    <ModalFrame title={place.name} onClose={onClose} className="max-w-md">
      <div className="px-5 pb-5">
        <div className="relative h-44 overflow-hidden rounded-xl bg-slate-100">
          <img
            src={placeImage(place)}
            alt={place.name}
            className="size-full object-cover"
          />
          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs font-semibold text-white">
            1/{Math.max(place.images?.length || 1, 1)}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {place.rating?.toFixed(1) ?? "N/A"}
          </span>
          <span>·</span>
          <span>{compactPrice(place)}</span>
          <span className="ml-auto text-emerald-600">● Dữ liệu DB</span>
        </div>
        <p className="mt-3 text-sm text-slate-700">{place.address || place.district || "Chưa có địa chỉ"}</p>
        <p className="mt-1 text-sm text-slate-500">
          {place.latitude && place.longitude
            ? `${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`
            : "Chưa có tọa độ"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">
            {categoryLabel(place.category)}
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <section className="mt-6">
          <h3 className="font-semibold">Mô tả</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Địa điểm thuộc nhóm {categoryLabel(place.category).toLowerCase()}
            {place.district ? ` tại ${place.district}` : ""}. Thông tin ảnh,
            giá, đánh giá và tag được lấy từ database hiện tại.
          </p>
        </section>
        <section className="mt-6">
          <h3 className="font-semibold">Khoảng giá</h3>
          <p className="mt-2 text-sm text-slate-600">{formatPrice(place)}</p>
        </section>
      </div>
      <footer className="flex gap-3 border-t border-slate-100 px-5 py-4">
        <button
          disabled={isSaved}
          onClick={() => onAddPlace(place)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-indigo-500/20 transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
        >
          {isSaved ? "Đã thêm" : "Thêm vào danh sách"}
          <Bookmark className="size-4" />
        </button>
      </footer>
    </ModalFrame>
  );
}

export function NewListModal({
  onCreate,
  onClose,
}: {
  onCreate: (name: string, icon?: string) => void;
  onClose: () => void;
}) {
  const [listName, setListName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("bookmark");

  return (
    <ModalFrame title="Tạo danh sách mới" onClose={onClose} className="max-w-md">
      <div className="space-y-6 px-5 pb-5">
        <label className="block">
          <span className="text-sm font-semibold">Tên danh sách</span>
          <input
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            placeholder="VD: Địa điểm ăn uống yêu thích"
            className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Mô tả <span className="font-normal text-slate-500">(tùy chọn)</span></span>
          <textarea
            placeholder="Mô tả ngắn về danh sách"
            className="mt-3 h-20 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <section>
          <h3 className="text-sm font-semibold">Chọn biểu tượng</h3>
          <div className="mt-3 grid grid-cols-6 gap-3">
            {listIconOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedIcon(value)}
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl border text-slate-700",
                  selectedIcon === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200",
                )}
              >
                <Icon className="size-5" />
              </button>
            ))}
          </div>
        </section>
      </div>
      <FooterActions
        confirmLabel="Tạo mới"
        onCancel={onClose}
        onConfirm={() => onCreate(listName.trim() || "Danh sách mới", selectedIcon)}
      />
    </ModalFrame>
  );
}

export function ActiveFiltersModal({
  filters,
  resultCount,
  onClear,
  onClose,
}: {
  filters: PlaceFilters;
  resultCount: number;
  onClear: () => void;
  onClose: () => void;
}) {
  const active = [
    filters.district,
    priceOptions.find((option) => option.value === filters.price)?.label !== "Tất cả"
      ? priceOptions.find((option) => option.value === filters.price)?.label
      : "",
    ratingOptions.find((option) => option.value === filters.rating)?.label !== "Tất cả"
      ? ratingOptions.find((option) => option.value === filters.rating)?.label
      : "",
    ...Object.entries(filters.tags).flatMap(([group, values]) =>
      values.map((value) => `${tagGroupLabel(group, filters.category)}: ${tagLabel(value)}`),
    ),
  ].filter(Boolean);

  return (
    <ModalFrame title="Bộ lọc đang áp dụng" onClose={onClose} className="max-w-md">
      <div className="px-5 pb-5">
        <div className="mt-6 flex flex-wrap gap-2">
          {active.length ? (
            active.map((item) => (
              <span key={item} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">
                {item} <X className="ml-1 inline size-3.5" />
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">Chưa có bộ lọc nào.</span>
          )}
        </div>
        <div className="mt-10 flex justify-end">
          <button onClick={onClear} className="text-sm font-semibold text-primary">
            Xóa tất cả
          </button>
        </div>
        <p className="mt-10 text-center text-sm text-slate-500">
          {resultCount.toLocaleString("vi-VN")} địa điểm phù hợp
        </p>
        <button
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-indigo-500/20"
        >
          Xem kết quả
        </button>
      </div>
    </ModalFrame>
  );
}

export function SortModal({
  value,
  onChange,
  onClose,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Sắp xếp theo" onClose={onClose} className="max-w-md">
      <div className="px-5 pb-7">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const active = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className="flex h-12 w-full items-center justify-between gap-3 border-b border-slate-100 text-left text-sm font-semibold"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <Icon className={cn("size-4", option.value === "rating" ? "fill-current" : "")} />
                </span>
                <span className={cn("truncate", active && "text-primary")}>
                  {option.label}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary text-white" : "border-slate-300",
                )}
              >
                {active ? <Check className="size-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </ModalFrame>
  );
}

export function TipsModal({ onClose }: { onClose: () => void }) {
  const tips = [
    {
      icon: Bookmark,
      title: "Lưu địa điểm",
      description: "Nhấn vào dấu + để lưu địa điểm vào danh sách",
    },
    {
      icon: ChevronRight,
      title: "Kéo & thả",
      description: "Sắp xếp địa điểm trong danh sách chuyến đi",
    },
    {
      icon: SlidersHorizontal,
      title: "Bộ lọc",
      description: "Sử dụng bộ lọc để tìm địa điểm phù hợp",
    },
    {
      icon: ListFilter,
      title: "Sắp xếp",
      description: "Sắp xếp theo nhu cầu để xem nhanh nhất",
    },
  ];

  return (
    <ModalFrame title="Mẹo sử dụng" onClose={onClose} className="max-w-md">
      <div className="space-y-4 px-5 pb-5">
        {tips.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" className="size-4 rounded border-slate-300" />
          Không hiển thị lại
        </label>
        <button
          onClick={onClose}
          className="h-11 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground"
        >
          Đã hiểu
        </button>
      </footer>
    </ModalFrame>
  );
}
