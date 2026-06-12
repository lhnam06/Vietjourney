import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  Info,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import {
  categoryFilter,
  categoryLabel,
  compactPrice,
  fetchPlaces,
  formatPrice,
  placeImage,
  type Place,
} from "../lib/placesApi";
import { cn } from "../lib/utils";
import {
  ActiveFiltersModal,
  AreaModal,
  CategoryModal,
  FilterModal,
  PlaceDetailModal,
  SortModal,
  TipsModal,
  type ModalType,
  type PlaceFilters,
  type SortOption,
  type TagOptionGroup,
} from "./Popups";

const defaultFilters: PlaceFilters = {
  district: "",
  category: "ALL",
  price: "all",
  rating: "all",
  tags: {},
};

const categories = [
  { value: "ALL", label: "Tất cả" },
  { value: "FOOD", label: "Ẩm thực" },
  { value: "DRINK", label: "Đồ uống" },
  { value: "ACTIVITY", label: "Trải nghiệm" },
];

const categoryStyles: Record<string, string> = {
  FOOD: "bg-orange-100 text-orange-700",
  DRINK: "bg-amber-100 text-amber-700",
  ACTIVITY: "bg-emerald-100 text-emerald-700",
};

interface ExploreProps {
  savedPlaceIds: Set<string>;
  onAddPlace: (place: Place) => void;
}

function priceRange(price: PlaceFilters["price"]) {
  switch (price) {
    case "under100":
      return { maxPrice: 100000 };
    case "100to300":
      return { minPrice: 100000, maxPrice: 300000 };
    case "300to500":
      return { minPrice: 300000, maxPrice: 500000 };
    case "500to1000":
      return { minPrice: 500000, maxPrice: 1000000 };
    case "over1000":
      return { minPrice: 1000000 };
    default:
      return {};
  }
}

function minRating(rating: PlaceFilters["rating"]) {
  if (rating === "4") return 4;
  if (rating === "4.5") return 4.5;
  if (rating === "5") return 5;
  return undefined;
}

function activeFilterCount(filters: PlaceFilters) {
  return [
    filters.district,
    filters.category !== "ALL" ? filters.category : "",
    filters.price !== "all" ? filters.price : "",
    filters.rating !== "all" ? filters.rating : "",
    ...Object.values(filters.tags).flat(),
  ].filter(Boolean).length;
}

function sortPlaces(places: Place[], sort: SortOption) {
  const sortedPlaces = [...places];

  switch (sort) {
    case "rating":
    case "best":
      return sortedPlaces.sort((first, second) => (second.rating || 0) - (first.rating || 0));
    case "priceAsc":
      return sortedPlaces.sort((first, second) => (first.minPrice || 0) - (second.minPrice || 0));
    case "priceDesc":
      return sortedPlaces.sort((first, second) => (second.maxPrice || 0) - (first.maxPrice || 0));
    case "newest":
      return sortedPlaces.reverse();
    case "distance":
    default:
      return sortedPlaces;
  }
}

function Rating({ rating }: { rating?: number | null }) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
      <Star className="size-4 fill-amber-400 text-amber-400" />
      {rating?.toFixed(1) ?? "N/A"}
    </span>
  );
}

function CategoryBadge({ category }: { category?: string | null }) {
  return (
    <span
      className={cn(
        "mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
        categoryStyles[category || ""] || "bg-sky-100 text-sky-700",
      )}
    >
      {categoryLabel(category)}
    </span>
  );
}

function SuggestionCard({
  place,
  isSaved,
  onAddPlace,
  onOpenPlace,
}: {
  place: Place;
  isSaved: boolean;
  onAddPlace: (place: Place) => void;
  onOpenPlace: (place: Place) => void;
}) {
  return (
    <article
      onClick={() => onOpenPlace(place)}
      className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative h-32">
        <img
          src={placeImage(place)}
          alt={place.name}
          className="size-full object-cover"
        />
        <button
          aria-label={`Thêm ${place.name}`}
          disabled={isSaved}
          onClick={(event) => {
            event.stopPropagation();
            onAddPlace(place);
          }}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm backdrop-blur transition-colors hover:bg-card disabled:cursor-default disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="p-3">
        <h3 className="truncate font-semibold text-foreground">{place.name}</h3>
        <div className="mt-1.5">
          <Rating rating={place.rating} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {place.district || place.address || "Chưa có khu vực"} · {compactPrice(place)}
        </p>
      </div>
    </article>
  );
}

function PlaceRow({
  place,
  isSaved,
  onAddPlace,
  onOpenPlace,
}: {
  place: Place;
  isSaved: boolean;
  onAddPlace: (place: Place) => void;
  onOpenPlace: (place: Place) => void;
}) {
  return (
    <article
      onClick={() => onOpenPlace(place)}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
    >
      <button
        aria-label="Kéo để sắp xếp"
        className="mt-6 cursor-grab text-muted-foreground/50"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="grid grid-cols-2 gap-0.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="size-1 rounded-full bg-current" />
          ))}
        </span>
      </button>
      <img
        src={placeImage(place)}
        alt={place.name}
        className="size-16 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">{place.name}</h3>
        <div className="mt-1 flex items-center gap-1.5 text-sm">
          <Rating rating={place.rating} />
          <span className="truncate text-muted-foreground">· {formatPrice(place)}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {place.district || place.address || "Chưa có địa chỉ"}
        </p>
        <CategoryBadge category={place.category} />
      </div>
      <button
        aria-label={`Thêm ${place.name}`}
        disabled={isSaved}
        onClick={(event) => {
          event.stopPropagation();
          onAddPlace(place);
        }}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50"
      >
        <Plus className="size-4" />
      </button>
    </article>
  );
}

export function Explore({ savedPlaceIds, onAddPlace }: ExploreProps) {
  const [filters, setFilters] = useState<PlaceFilters>(defaultFilters);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("best");
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlaces() {
      setLoading(true);
      setError(null);

      try {
        const page = await fetchPlaces(
          {
            category: categoryFilter(filters.category),
            district: filters.district || undefined,
            tags: Object.keys(filters.tags).length ? filters.tags : undefined,
            minRating: minRating(filters.rating),
            ...priceRange(filters.price),
            size: 80,
          },
          controller.signal,
        );

        setPlaces(page.data);
        setTotal(page.total);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Không tải được địa điểm");
        setPlaces([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlaces();

    return () => controller.abort();
  }, [filters]);

  const districts = useMemo(() => {
    const districtMap = new Map<string, { name: string; count: number; image?: string }>();

    places.forEach((place) => {
      if (!place.district) return;
      const current = districtMap.get(place.district);
      districtMap.set(place.district, {
        name: place.district,
        count: (current?.count || 0) + 1,
        image: current?.image || placeImage(place),
      });
    });

    return [...districtMap.values()].sort((first, second) => second.count - first.count);
  }, [places]);

  const tagOptions = useMemo<TagOptionGroup[]>(() => {
    const tagMap = new Map<string, Set<string>>();

    places.forEach((place) => {
      Object.entries(place.tags || {}).forEach(([group, values]) => {
        if (!tagMap.has(group)) {
          tagMap.set(group, new Set());
        }

        values.forEach((value) => {
          if (value) {
            tagMap.get(group)?.add(value);
          }
        });
      });
    });

    return [...tagMap.entries()].map(([group, values]) => ({
      group,
      values: [...values].sort((first, second) => first.localeCompare(second)),
    }));
  }, [places]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchedPlaces = !normalizedQuery
      ? places
      : places.filter((place) => {
          const searchable = [
            place.name,
            place.address,
            place.district,
            categoryLabel(place.category),
            ...Object.values(place.tags || {}).flat(),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(normalizedQuery);
        });

    return sortPlaces(searchedPlaces, sort);
  }, [places, query, sort]);

  const suggestions = filteredPlaces.slice(0, 3);
  const filterCount = activeFilterCount(filters);

  function openPlace(place: Place) {
    setSelectedPlace(place);
    setModal("place");
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-3xl">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-balance text-3xl font-bold text-foreground">
                Khám phá địa điểm
              </h1>
              <p className="mt-1 text-muted-foreground">
                Tìm kiếm và lưu địa điểm từ dữ liệu backend VietJourney.
              </p>
            </div>
            <button
              onClick={() => setModal("tips")}
              className="hidden shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent sm:flex"
            >
              <Info className="size-4" />
              Mẹo sử dụng
            </button>
          </header>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="size-5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm địa điểm, món ăn, trải nghiệm..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              aria-label="Tùy chọn tìm kiếm"
              onClick={() => setModal("filters")}
              className="text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="size-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setFilters({ ...filters, category: category.value })}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  filters.category === category.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent",
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setModal("area")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              <MapPin className="size-4 text-muted-foreground" />
              {filters.district || "Tất cả khu vực"}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setModal("filters")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              <Filter className="size-4 text-muted-foreground" />
              Bộ lọc
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {filterCount}
              </span>
            </button>
            <button
              onClick={() => setModal("category")}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              {filters.category === "ALL" ? "Loại hình" : categoryLabel(filters.category)}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {filterCount > 0 ? (
              <button
                onClick={() => setModal("active-filters")}
                className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
              >
                Đang áp dụng {filterCount}
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mt-8 rounded-2xl border border-destructive/30 bg-card p-5 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="size-5 text-primary" />
              Gợi ý nổi bật
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-56 animate-pulse rounded-2xl border border-border bg-card"
                    />
                  ))
                : suggestions.map((place) => (
                    <SuggestionCard
                      key={place.id}
                      place={place}
                      isSaved={savedPlaceIds.has(place.id)}
                      onAddPlace={onAddPlace}
                      onOpenPlace={openPlace}
                    />
                  ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold text-foreground">Tất cả địa điểm</h2>
              <button
                onClick={() => setModal("sort")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {filteredPlaces.length}/{total} địa điểm
                <ChevronDown className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {loading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-2xl border border-border bg-card"
                    />
                  ))
                : filteredPlaces.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      isSaved={savedPlaceIds.has(place.id)}
                      onAddPlace={onAddPlace}
                      onOpenPlace={openPlace}
                    />
                  ))}
            </div>
            {!loading && filteredPlaces.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy địa điểm phù hợp.
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {modal === "area" ? (
        <AreaModal
          districts={districts}
          selectedDistrict={filters.district}
          onSelect={(district) => setFilters({ ...filters, district })}
          onReset={() => setFilters({ ...filters, district: "" })}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "filters" ? (
        <FilterModal
          filters={filters}
          tagOptions={tagOptions}
          onChange={setFilters}
          onReset={clearFilters}
          onApply={() => setModal("active-filters")}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "place" && selectedPlace ? (
        <PlaceDetailModal
          place={selectedPlace}
          isSaved={savedPlaceIds.has(selectedPlace.id)}
          onAddPlace={onAddPlace}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "active-filters" ? (
        <ActiveFiltersModal
          filters={filters}
          resultCount={filteredPlaces.length}
          onClear={clearFilters}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "category" ? (
        <CategoryModal
          value={filters.category}
          onChange={(category) => setFilters({ ...filters, category })}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "sort" ? (
        <SortModal
          value={sort}
          onChange={(nextSort) => {
            setSort(nextSort);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "tips" ? <TipsModal onClose={() => setModal(null)} /> : null}
    </>
  );
}
