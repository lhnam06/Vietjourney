import { useState, type DragEvent } from "react";
import {
  ChevronDown,
  Copy,
  Bookmark,
  Camera,
  Coffee,
  Heart,
  HandMetal,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PlaceList } from "../App";
import {
  categoryLabel,
  placeImage,
  tagLabel,
  type Place,
} from "../lib/placesApi";
import { cn } from "../lib/utils";
import { NewListModal } from "./Popups";

const categoryStyles: Record<string, string> = {
  FOOD: "bg-orange-100 text-orange-700",
  DRINK: "bg-amber-100 text-amber-700",
  ACTIVITY: "bg-emerald-100 text-emerald-700",
};

function placeSubCategory(place: Place) {
  return place.tags?.sub_category?.find(Boolean);
}

type ListDragPayload =
  | { kind: "discovery-place"; place: Place }
  | { kind: "saved-list-place"; placeId: string };

interface ListPanelProps {
  lists: PlaceList[];
  activeListId: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string, icon?: string) => void;
  onRenameList: (name: string) => void;
  onDuplicateList: () => void;
  onClearList: () => void;
  onDeleteList: () => void;
  onAddPlace: (place: Place) => void;
  onRemovePlace: (placeId: string) => void;
  onReorderPlace: (placeId: string, targetPlaceId: string) => void;
  onOpenTrips: () => void;
}

export function ListPanel({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onClearList,
  onDeleteList,
  onAddPlace,
  onRemovePlace,
  onReorderPlace,
  onOpenTrips,
}: ListPanelProps) {
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const activeList = lists.find((list) => list.id === activeListId) || lists[0];
  const savedPlaces = activeList?.places || [];
  const ActiveIcon = listIcon(activeList?.icon);

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDropActive(true);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDropActive(false);

    const payload = parseListDragPayload(event);
    if (!payload) return;

    if (payload.kind === "discovery-place") {
      onAddPlace(payload.place);
    }
  }

  function handleSavedPlaceDragStart(event: DragEvent, placeId: string) {
    event.dataTransfer.setData("application/json", JSON.stringify({ kind: "saved-list-place", placeId }));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleSavedPlaceDrop(event: DragEvent, targetPlaceId: string) {
    event.preventDefault();
    const payload = parseListDragPayload(event);
    if (!payload) return;

    if (payload.kind === "discovery-place") {
      onAddPlace(payload.place);
      return;
    }

    onReorderPlace(payload.placeId, targetPlaceId);
  }

  function renameList() {
    const nextName = window.prompt("Tên danh sách", activeList?.name || "");
    const trimmedName = nextName?.trim();
    if (trimmedName) {
      onRenameList(trimmedName);
    }
    setIsMenuOpen(false);
  }

  function deleteList() {
    if (lists.length <= 1) return;
    const confirmed = window.confirm(`Xóa danh sách "${activeList?.name}"?`);
    if (confirmed) {
      onDeleteList();
    }
    setIsMenuOpen(false);
  }

  function closeMobilePanel() {
    setIsMobilePanelOpen(false);
    setIsListMenuOpen(false);
    setIsMenuOpen(false);
  }

  return (
    <>
      <aside className="hidden w-[22.5rem] shrink-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm xl:my-3 xl:mr-3 xl:flex">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Danh sách của bạn</h2>
          <button
            onClick={() => setIsNewListOpen(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" />
            Tạo mới
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsListMenuOpen((open) => !open)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/35 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ActiveIcon className="size-4" />
                </span>
                <span className="truncate">{activeList?.name || "Danh sách"}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {isListMenuOpen ? (
              <div className="absolute left-0 right-0 top-14 z-30 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      onSelectList(list.id);
                      setIsListMenuOpen(false);
                    }}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition-colors",
                      list.id === activeList?.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const Icon = listIcon(list.icon);
                        return <Icon className="size-4 shrink-0" />;
                      })()}
                      <span className="truncate">{list.name}</span>
                    </span>
                    <span className="ml-3 text-xs opacity-75">{list.places.length}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            aria-label="Tùy chọn danh sách"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex size-12 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <MoreHorizontal className="size-5" />
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 top-14 z-20 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
              <MenuButton icon={Pencil} label="Đổi tên" onClick={renameList} />
              <MenuButton
                icon={Copy}
                label="Nhân bản"
                onClick={() => {
                  onDuplicateList();
                  setIsMenuOpen(false);
                }}
              />
              <MenuButton
                icon={X}
                label="Xóa hết địa điểm"
                onClick={() => {
                  onClearList();
                  setIsMenuOpen(false);
                }}
              />
              <div className="my-1 h-px bg-border" />
              <MenuButton
                icon={Trash2}
                label="Xóa danh sách"
                danger
                disabled={lists.length <= 1}
                onClick={deleteList}
              />
            </div>
          ) : null}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDrop}
          className={cn(
            "mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed p-3 text-left transition-colors",
            isDropActive
              ? "border-primary bg-primary/10"
              : "border-primary/35 bg-accent/40",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
            <HandMetal className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Kéo địa điểm vào đây</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kéo card hoặc bấm "+" để thêm vào danh sách hiện tại.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {savedPlaces.length} địa điểm
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDrop}
          className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1"
        >
          {savedPlaces.map((place) => (
            <div
              key={place.id}
              draggable
              onDragStart={(event) => handleSavedPlaceDragStart(event, place.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleSavedPlaceDrop(event, place.id)}
              className="flex cursor-grab items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-sm active:cursor-grabbing"
            >
              <span className="grid grid-cols-2 gap-0.5 text-muted-foreground/55">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={index} className="size-1 rounded-full bg-current" />
                ))}
              </span>
              <img
                src={placeImage(place)}
                alt={place.name}
                className="h-16 w-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {place.name}
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                      categoryStyles[place.category || ""] || "bg-sky-100 text-sky-700",
                    )}
                  >
                    {categoryLabel(place.category)}
                  </span>
                  {placeSubCategory(place) ? (
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {tagLabel(placeSubCategory(place) || "")}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                aria-label={`Xóa ${place.name}`}
                onClick={() => onRemovePlace(place.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}

          {savedPlaces.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
              Chưa có địa điểm nào trong danh sách.
            </div>
          ) : null}
        </div>

        <button
          onClick={onOpenTrips}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Chuyến đi của tôi
        </button>
      </aside>

      <div className="xl:hidden">
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className="fixed bottom-[calc(5.9rem+env(safe-area-inset-bottom))] right-4 z-[1050] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_42px_oklch(0.515_0.22_277_/_0.34)] transition-transform hover:-translate-y-0.5"
        >
          <ActiveIcon className="size-4" />
          Danh sách
          <span className="rounded-full bg-white/18 px-2 py-0.5 text-xs font-bold">{savedPlaces.length}</span>
        </button>

        {isMobilePanelOpen ? (
          <button
            type="button"
            aria-label="Đóng danh sách đã lưu"
            onClick={closeMobilePanel}
            className="fixed inset-0 z-[1055] bg-slate-950/40 backdrop-blur-[2px]"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-x-0 bottom-0 z-[1060] rounded-t-[30px] border border-border bg-card shadow-[0_-20px_60px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out",
            isMobilePanelOpen ? "translate-y-0" : "pointer-events-none translate-y-full",
          )}
        >
          <div className="mx-auto flex max-h-[78vh] w-full max-w-xl flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Danh sách của bạn</h2>
                <p className="mt-1 text-sm text-muted-foreground">{savedPlaces.length} địa điểm đã lưu</p>
              </div>
              <button
                type="button"
                onClick={closeMobilePanel}
                className="flex size-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setIsListMenuOpen((open) => !open)}
                  className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/35 hover:bg-accent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ActiveIcon className="size-4" />
                    </span>
                    <span className="truncate">{activeList?.name || "Danh sách"}</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
                {isListMenuOpen ? (
                  <div className="absolute left-0 right-0 top-14 z-30 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => {
                          onSelectList(list.id);
                          setIsListMenuOpen(false);
                        }}
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition-colors",
                          list.id === activeList?.id
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {(() => {
                            const Icon = listIcon(list.icon);
                            return <Icon className="size-4 shrink-0" />;
                          })()}
                          <span className="truncate">{list.name}</span>
                        </span>
                        <span className="ml-3 text-xs opacity-75">{list.places.length}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Tùy chọn danh sách"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex size-12 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent"
              >
                <MoreHorizontal className="size-5" />
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-14 z-20 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                  <MenuButton icon={Pencil} label="Đổi tên" onClick={renameList} />
                  <MenuButton
                    icon={Copy}
                    label="Nhân bản"
                    onClick={() => {
                      onDuplicateList();
                      setIsMenuOpen(false);
                    }}
                  />
                  <MenuButton
                    icon={X}
                    label="Xóa hết địa điểm"
                    onClick={() => {
                      onClearList();
                      setIsMenuOpen(false);
                    }}
                  />
                  <div className="my-1 h-px bg-border" />
                  <MenuButton
                    icon={Trash2}
                    label="Xóa danh sách"
                    danger
                    disabled={lists.length <= 1}
                    onClick={deleteList}
                  />
                </div>
              ) : null}
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={handleDrop}
              className={cn(
                "mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed p-3 text-left transition-colors",
                isDropActive ? "border-primary bg-primary/10" : "border-primary/35 bg-accent/40",
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                <HandMetal className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Kéo địa điểm vào đây</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kéo card hoặc bấm "+" để thêm vào danh sách hiện tại.
                </p>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={handleDrop}
              className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            >
              {savedPlaces.map((place) => (
                <div
                  key={place.id}
                  draggable
                  onDragStart={(event) => handleSavedPlaceDragStart(event, place.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleSavedPlaceDrop(event, place.id)}
                  className="flex cursor-grab items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-sm active:cursor-grabbing"
                >
                  <span className="grid grid-cols-2 gap-0.5 text-muted-foreground/55">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span key={index} className="size-1 rounded-full bg-current" />
                    ))}
                  </span>
                  <img
                    src={placeImage(place)}
                    alt={place.name}
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{place.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                          categoryStyles[place.category || ""] || "bg-sky-100 text-sky-700",
                        )}
                      >
                        {categoryLabel(place.category)}
                      </span>
                      {placeSubCategory(place) ? (
                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {tagLabel(placeSubCategory(place) || "")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    aria-label={`Xóa ${place.name}`}
                    onClick={() => onRemovePlace(place.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}

              {savedPlaces.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                  Chưa có địa điểm nào trong danh sách.
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                closeMobilePanel();
                onOpenTrips();
              }}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Chuyến đi của tôi
            </button>
          </div>
        </aside>
      </div>

      {isNewListOpen ? (
        <NewListModal
          onCreate={(name, icon) => {
            onCreateList(name, icon);
            setIsNewListOpen(false);
          }}
          onClose={() => setIsNewListOpen(false)}
        />
      ) : null}
    </>
  );
}

export function listIcon(icon?: string): LucideIcon {
  switch (icon) {
    case "heart":
      return Heart;
    case "camera":
      return Camera;
    case "coffee":
      return Coffee;
    case "map-pin":
      return MapPin;
    case "star":
      return Star;
    case "bookmark":
    default:
      return Bookmark;
  }
}

function parseListDragPayload(event: DragEvent): ListDragPayload | null {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json")) as ListDragPayload;
  } catch {
    return null;
  }
}

function MenuButton({
  icon: Icon,
  label,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
