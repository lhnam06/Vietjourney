import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

type DateScrollStripProps = {
  children: ReactNode;
  activeId?: string;
  className?: string;
  scrollClassName?: string;
  arrowClassName?: string;
  scrollAmount?: number;
};

export function DateScrollStrip({
  children,
  activeId,
  className,
  scrollClassName,
  arrowClassName,
  scrollAmount = 168,
}: DateScrollStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, children]);

  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-scroll-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeId, children]);

  const scroll = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  const arrowButtonClass = cn(
    'h-8 w-8 shrink-0 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-30',
    arrowClassName
  );

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={arrowButtonClass}
        disabled={!canScrollLeft}
        aria-label="Cuộn ngày trước"
        onClick={() => scroll(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        ref={scrollRef}
        className={cn('flex min-w-0 flex-1 gap-1.5 overflow-x-auto no-scrollbar', scrollClassName)}
      >
        {children}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={arrowButtonClass}
        disabled={!canScrollRight}
        aria-label="Cuộn ngày sau"
        onClick={() => scroll(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
