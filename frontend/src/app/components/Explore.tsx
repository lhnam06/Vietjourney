import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
  fetchDistricts,
  fetchPlaces,
  formatPrice,
  normalizeCategory,
  placeImage,
  tagLabel,
  tagOptionsForCategory,
  type DistrictSummary,
  type Place,
  type PlaceFilterRequest,
} from "../lib/placesApi";
import { cn } from "../lib/utils";
import {
  ActiveFiltersModal,
  AreaModal,
  FilterModal,
  PlaceDetailModal,
  SortModal,
  TipsModal,
  type ModalType,
  type PlaceFilters,
  type SortOption,
  type TagOptionGroup,
} from "./Popups";
import {
  fetchRecommendedPlaces,
  recordPlaceInteraction,
} from "../lib/recommendationApi";

const defaultFilters: PlaceFilters = {
  district: "",
  category: "FOOD",
  price: "all",
  rating: "all",
  tags: {},
};

const categories = [
  { value: "FOOD", label: "Ẩm thực" },
  { value: "DRINK", label: "Đồ uống" },
  { value: "ACTIVITY", label: "Trải nghiệm" },
];

const PAGE_SIZE = 80;

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
    filters.price !== "all" ? filters.price : "",
    filters.rating !== "all" ? filters.rating : "",
    ...Object.values(filters.tags).flat(),
  ].filter(Boolean).length;
}

function buildPlaceRequest(filters: PlaceFilters, page = 0): PlaceFilterRequest {
  return {
    category: categoryFilter(normalizeCategory(filters.category)),
    district: filters.district || undefined,
    tags: Object.keys(filters.tags).length ? filters.tags : undefined,
    minRating: minRating(filters.rating),
    ...priceRange(filters.price),
    page,
    size: PAGE_SIZE,
  };
}

function buildDistrictRequest(filters: PlaceFilters): PlaceFilterRequest {
  return {
    category: categoryFilter(normalizeCategory(filters.category)),
    tags: Object.keys(filters.tags).length ? filters.tags : undefined,
    minRating: minRating(filters.rating),
    ...priceRange(filters.price),
  };
}

function mergePlaces(existing: Place[], incoming: Place[]) {
  const seen = new Set(existing.map((place) => place.id));
  const next = [...existing];

  incoming.forEach((place) => {
    if (!seen.has(place.id)) {
      seen.add(place.id);
      next.push(place);
    }
  });

  return next;
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

function placeSubCategory(place: Place) {
  return place.tags?.sub_category?.find(Boolean);
}

function CategoryBadges({ place }: { place: Place }) {
  const subCategory = placeSubCategory(place);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className={cn(
          "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
          categoryStyles[place.category || ""] || "bg-sky-100 text-sky-700",
        )}
      >
        {categoryLabel(place.category)}
      </span>
      {subCategory ? (
        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {tagLabel(subCategory)}
        </span>
      ) : null}
    </div>
  );
}

function SuggestionCard({
  place,
  isSaved,
  onAddPlace,
  onOpenPlace,
  onDragStart,
}: {
  place: Place;
  isSaved: boolean;
  onAddPlace: (place: Place) => void;
  onOpenPlace: (place: Place) => void;
  onDragStart: (event: DragEvent, place: Place) => void;
}) {
  return (
    <article
      draggable
      onClick={() => onOpenPlace(place)}
      onDragStart={(event) => onDragStart(event, place)}
      className="cursor-grab overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md active:cursor-grabbing"
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
  onDragStart,
}: {
  place: Place;
  isSaved: boolean;
  onAddPlace: (place: Place) => void;
  onOpenPlace: (place: Place) => void;
  onDragStart: (event: DragEvent, place: Place) => void;
}) {
  return (
    <article
      draggable
      onClick={() => onOpenPlace(place)}
      onDragStart={(event) => onDragStart(event, place)}
      className="flex cursor-grab items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md active:cursor-grabbing"
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
        className="h-24 w-32 shrink-0 rounded-xl object-cover"
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
        <CategoryBadges place={place} />
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
  const [recommendedPlaces, setRecommendedPlaces] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const viewedSuggestionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlaces() {
      setLoading(true);
      setError(null);
      setPlaces([]);
      setTotal(0);
      setCurrentPage(0);
      setHasMore(false);

      try {
        const page = await fetchPlaces(buildPlaceRequest(filters, 0), controller.signal);

        setPlaces(page.data);
        setTotal(page.total);
        setCurrentPage(page.page);
        setHasMore(page.page + 1 < page.totalPages);
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecommendations() {
      try {
        const nextRecommendations = await fetchRecommendedPlaces(24, controller.signal);
        setRecommendedPlaces(nextRecommendations);
      } catch {
        if (!controller.signal.aborted) {
          setRecommendedPlaces([]);
        }
      }
    }

    loadRecommendations();

    return () => controller.abort();
  }, [filters.category]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDistricts() {
      try {
        const nextDistricts = await fetchDistricts(buildDistrictRequest(filters), controller.signal);
        setDistricts(nextDistricts);
      } catch {
        if (!controller.signal.aborted) {
          setDistricts([]);
        }
      }
    }

    loadDistricts();

    return () => controller.abort();
  }, [filters.category, filters.price, filters.rating, filters.tags]);

  const tagOptions = useMemo<TagOptionGroup[]>(
    () => tagOptionsForCategory(filters.category),
    [filters.category],
  );

  const loadMorePlaces = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setLoadingMore(true);

    try {
      const page = await fetchPlaces(buildPlaceRequest(filters, nextPage));
      setPlaces((currentPlaces) => mergePlaces(currentPlaces, page.data));
      setTotal(page.total);
      setCurrentPage(page.page);
      setHasMore(page.page + 1 < page.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải thêm được địa điểm");
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, filters, hasMore, loading, loadingMore]);

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

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMorePlaces();
        }
      },
      {
        root: scrollRootRef.current,
        rootMargin: "640px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredPlaces.length, hasMore, loadMorePlaces, loading, loadingMore]);

  const suggestions = useMemo(() => {
    const category = normalizeCategory(filters.category);
    const recommendedForCategory = recommendedPlaces.filter(
      (place) => normalizeCategory(place.category) === category,
    );

    return mergePlaces(recommendedForCategory, filteredPlaces).slice(0, 3);
  }, [filteredPlaces, filters.category, recommendedPlaces]);
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    suggestions.forEach((place) => {
      const key = `${place.category || "place"}:${place.id}`;
      if (viewedSuggestionIdsRef.current.has(key)) return;

      viewedSuggestionIdsRef.current.add(key);
      void recordPlaceInteraction({ place, eventType: "VIEWPORT" }).catch(() => undefined);
    });
  }, [suggestions]);

  function openPlace(place: Place) {
    void recordPlaceInteraction({ place, eventType: "CLICK" }).catch(() => undefined);
    setSelectedPlace(place);
    setModal("place");
  }

  function addPlace(place: Place) {
    void recordPlaceInteraction({ place, eventType: "ADD_TO_TIMELINE" }).catch(() => undefined);
    onAddPlace(place);
  }

  function handlePlaceDragStart(event: DragEvent, place: Place) {
    event.dataTransfer.setData("application/json", JSON.stringify({ kind: "discovery-place", place }));
    event.dataTransfer.effectAllowed = "copy";
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  return (
    <>
      <main ref={scrollRootRef} className="flex-1 overflow-y-auto px-4 pb-6 pt-10 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-5xl">
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
                onClick={() => setFilters({ ...filters, category: category.value, tags: {} })}
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
                      onAddPlace={addPlace}
                      onOpenPlace={openPlace}
                      onDragStart={handlePlaceDragStart}
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
                      onAddPlace={addPlace}
                      onOpenPlace={openPlace}
                      onDragStart={handlePlaceDragStart}
                    />
                  ))}
            </div>
            {!loading && filteredPlaces.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy địa điểm phù hợp.
              </div>
            ) : null}
            <div ref={loadMoreRef} className="h-8" />
            {loadingMore ? (
              <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl border border-border bg-card"
                  />
                ))}
              </div>
            ) : null}
            {!loading && !hasMore && filteredPlaces.length > 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Đã hiển thị tất cả địa điểm phù hợp.
              </p>
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
          onAddPlace={addPlace}
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
