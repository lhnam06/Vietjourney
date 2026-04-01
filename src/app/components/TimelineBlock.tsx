import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Clock, Coffee, GripVertical, Landmark, MapPin, User, UtensilsCrossed } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { TimelineItem, Location } from '../data/mockData';

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
}

const ItemType = 'TIMELINE_ITEM';

const formatVND = (amount: number) => {
  if (amount === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s?VND$/, ' VND');
};

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
          <div className="text-xs font-semibold text-slate-400">{item.startTime}</div>
          <div className="text-[11px] text-slate-300 leading-none mt-0.5">Ngày</div>
          <div className="relative flex-1 w-full flex justify-center mt-2">
            <div className="absolute top-0 bottom-0 w-px bg-slate-200" />
            <div className="relative z-10 mt-1 w-3.5 h-3.5 rounded-full bg-[var(--vj-accent)] ring-4 ring-white" />
            {!isLast && (
              <div className="absolute top-6 bottom-0 w-px bg-slate-200" />
            )}
          </div>
        </div>

        {/* Card */}
        <Card
          ref={ref}
          className={`relative overflow-hidden transition-all cursor-move bg-white border border-white/15 shadow-md hover:shadow-lg ${
            isDragging ? 'opacity-50' : ''
          } ${isOver ? 'border-[var(--vj-accent)] border-2' : ''} ${
            isEditing ? 'ring-2 ring-[var(--vj-accent)] ring-offset-2 shadow-lg' : ''
          }`}
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
              <h3 className="font-semibold text-slate-900 leading-snug truncate">
                {location.name}
              </h3>

              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {item.startTime} - {item.endTime}
                </span>
                {ownerName && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    {ownerName}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {location.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[11px] px-2 py-0 bg-slate-100 text-slate-600"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex-shrink-0 flex flex-col items-end justify-start pt-0.5">
              <span className="text-xs font-semibold text-[var(--vj-primary)]">
                {formatVND(location.price)}
              </span>
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
