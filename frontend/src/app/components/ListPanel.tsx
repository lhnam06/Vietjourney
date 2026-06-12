import { useState } from "react";
import { ChevronDown, HandMetal, MoreHorizontal, Plus, X } from "lucide-react";
import {
  categoryLabel,
  placeImage,
  type Place,
} from "../lib/placesApi";
import { cn } from "../lib/utils";
import { NewListModal } from "./Popups";

const categoryStyles: Record<string, string> = {
  FOOD: "bg-orange-100 text-orange-700",
  DRINK: "bg-amber-100 text-amber-700",
  ACTIVITY: "bg-emerald-100 text-emerald-700",
};

interface ListPanelProps {
  savedPlaces: Place[];
  onRemovePlace: (placeId: string) => void;
}

export function ListPanel({ savedPlaces, onRemovePlace }: ListPanelProps) {
  const [listName, setListName] = useState("VietJourney");
  const [isNewListOpen, setIsNewListOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-80 shrink-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm xl:my-3 xl:mr-3 xl:flex">
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

        <div className="mt-4 flex items-center gap-2">
          <button className="flex flex-1 items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
            {listName}
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          <button
            aria-label="Thêm tùy chọn"
            className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-primary/40 bg-accent/40 p-5 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
            <HandMetal className="size-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            Thêm địa điểm vào đây
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bấm dấu "+" trên card để lưu địa điểm từ database.
          </p>
          <button className="mt-3 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Hoàn tất
          </button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {savedPlaces.length} địa điểm
        </p>

        <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
          {savedPlaces.map((place) => (
            <div
              key={place.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-sm"
            >
              <button
                aria-label="Kéo để sắp xếp"
                className="cursor-grab text-muted-foreground/50"
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
                className="size-11 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {place.name}
                </h3>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                    categoryStyles[place.category || ""] || "bg-sky-100 text-sky-700",
                  )}
                >
                  {categoryLabel(place.category)}
                </span>
              </div>
              <button
                aria-label={`Xóa ${place.name}`}
                onClick={() => onRemovePlace(place.id)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
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

        <button className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Xem danh sách
        </button>
      </aside>

      {isNewListOpen ? (
        <NewListModal
          onCreate={(name) => {
            setListName(name);
            setIsNewListOpen(false);
          }}
          onClose={() => setIsNewListOpen(false)}
        />
      ) : null}
    </>
  );
}
