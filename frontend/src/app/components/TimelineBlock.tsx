import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Clock, Coffee, GripVertical, Landmark, MapPin, MoreVertical, Trash2, Copy, Pencil, User, UtensilsCrossed } from 'lucide-react';
import { Card } from './ui/card';
import { TimelineItem, Location } from '../data/mockData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

interface TimelineBlockProps {
  index: number;
  item: TimelineItem;
  location: Location;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  isLast?: boolean;
  ownerName?: string;
  hasOverlap?: boolean;
  onEditTime?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
}

const ItemType = 'TIMELINE_ITEM';

function getActivityIcon(location: Location) {
  const tags = location.tags.join(' ').toLowerCase();
  const name = location.name.toLowerCase();

  if (tags.includes('cà phê') || name.includes('cà phê')) return Coffee;
  if (tags.includes('lịch sử') || tags.includes('văn hóa') || name.includes('văn miếu')) return Landmark;
  if (tags.includes('ẩm thực') || tags.includes('phở') || tags.includes('bữa')) return UtensilsCrossed;
  return MapPin;
}

export default function TimelineBlock({
  index,
  item,
  location,
  moveItem,
  isEditing,
  onEditStart,
  onEditEnd,
  isLast = false,
  ownerName,
  hasOverlap = false,
  onEditTime,
  onRemove,
  onDuplicate,
}: TimelineBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    hover(draggedItem: { index: number }) {
      if (!ref.current) return;

      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div ref={preview}>
      <div className="flex gap-3">
        {/* Timeline rail */}
        <div className="w-14 flex flex-col items-center pt-1">
          <div className="text-xs font-extrabold text-white/90 tabular-nums">{item.startTime}</div>
          <div className="text-[11px] text-white/65 leading-none mt-0.5">Ngày</div>
          <div className="relative flex-1 w-full flex justify-center mt-2">
            <div className="absolute top-0 bottom-0 w-px bg-white/25" />
            <div className="relative z-10 mt-1 w-3.5 h-3.5 rounded-full bg-[#F4B23A] ring-4 ring-[color-mix(in_oklab,#F4B23A_25%,transparent)]" />
            {!isLast && <div className="absolute top-6 bottom-0 w-px bg-white/25" />}
          </div>
        </div>

        {/* Card */}
        <Card
          ref={ref}
          className={`relative overflow-hidden transition-all cursor-move bg-white/95 border border-white/25 shadow-[0_10px_25px_rgba(0,0,0,.18)] hover:shadow-[0_14px_34px_rgba(0,0,0,.22)] rounded-2xl ${
            isDragging ? 'opacity-50' : ''
          } ${isOver ? 'border-[var(--vj-accent)] border-2' : ''} ${
            isEditing ? 'ring-2 ring-[var(--vj-accent)] ring-offset-2 shadow-lg' : ''
          } ${hasOverlap ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`}
          onClick={onEditStart}
        >
          <div className="flex gap-3 p-3">
            {/* Drag Handle */}
            <div className="flex-shrink-0 flex items-center text-slate-300 hover:text-slate-500">
              <GripVertical className="w-4.5 h-4.5" />
            </div>

            {/* Image + icon overlay */}
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img
                src={location.image}
                alt={location.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-lg bg-white/95 shadow flex items-center justify-center border border-slate-200">
                {(() => {
                  const Icon = getActivityIcon(location);
                  return <Icon className="w-4 h-4 text-[var(--vj-primary)]" />;
                })()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-900 leading-snug truncate">
                {location.name}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200">
                  <Clock className="w-3.5 h-3.5" />
                  {item.startTime}–{item.endTime}
                </span>
                {ownerName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200 text-slate-700">
                    <User className="w-3.5 h-3.5" />
                    {ownerName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center"
                    aria-label="Tùy chọn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      onEditTime?.();
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Chỉnh giờ
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      onDuplicate?.();
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    Nhân bản
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      onRemove?.();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Xoá
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editing Indicator */}
          {isEditing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--vj-accent)] to-[var(--vj-accent-2)] animate-pulse" />
          )}
        </Card>
      </div>
    </div>
  );
}
