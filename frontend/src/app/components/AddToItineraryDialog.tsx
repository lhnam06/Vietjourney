import { useMemo, useState } from 'react';
import { CalendarClock, StickyNote, Wallet } from 'lucide-react';
import type { Location, TimelineItem, Transaction, Trip, User } from '../data/mockData';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  trip: Trip;
  location: Location | null;
  users: User[];
  onCreate: (item: TimelineItem, tx?: Transaction) => void;
  defaultDate?: string;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export default function AddToItineraryDialog({
  open,
  onOpenChange,
  tripId,
  trip,
  location,
  users,
  onCreate,
  defaultDate,
}: Props) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [date, setDate] = useState(defaultDate ?? today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [companion, setCompanion] = useState('');
  const [amount, setAmount] = useState<string>('');

  const canSubmit = !!location && date && startTime && endTime;

  const reset = () => {
    setNotes('');
    setCompanion('');
    setAmount('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm vào lịch trình</DialogTitle>
          <DialogDescription>
            {location ? (
              <>
                <span className="font-semibold text-slate-900">{location.name}</span>
                <span className="text-slate-500"> • </span>
                <span className="text-slate-600">{trip.destination}</span>
              </>
            ) : (
              'Chọn địa điểm trước.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="inline-flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[var(--vj-accent)]" />
              Ngày
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="inline-flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[var(--vj-accent)]" />
              Khung giờ
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="inline-flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-[var(--vj-accent)]" />
              Ghi chú / bạn đồng hành (tuỳ chọn)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Ví dụ: đi cùng Nam"
                value={companion}
                onChange={(e) => setCompanion(e.target.value)}
                list={`vj-companion-${tripId}`}
              />
              <datalist id={`vj-companion-${tripId}`}>
                {users.map((u) => (
                  <option key={u.id} value={u.name} />
                ))}
              </datalist>
              <Input
                className="sm:col-span-2"
                placeholder="Ghi chú nhanh (ăn chay, đặt bàn, lưu ý đường đi...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="inline-flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--vj-accent)]" />
              Chi phí dự kiến (tuỳ chọn)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <Input
                inputMode="numeric"
                placeholder="Ví dụ: 120000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              />
              <div className="h-10 px-3 rounded-md border bg-slate-50 text-slate-700 flex items-center justify-center font-semibold">
                VND
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Nếu nhập chi phí, hệ thống sẽ tạo một mục chi trong Ngân Sách và liên kết với hoạt động này.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            disabled={!canSubmit}
            className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white"
            onClick={() => {
              if (!location) return;
              const id = `act-${Date.now()}`;
              const item: TimelineItem = {
                id,
                locationId: location.id,
                date,
                startTime,
                endTime,
                notes: [companion ? `Đi cùng: ${companion}` : '', notes].filter(Boolean).join(' • ') || undefined,
              };

              let tx: Transaction | undefined;
              const parsedAmount = amount ? Number(amount) : 0;
              if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
                const paidBy = users[0]?.id ?? 'user-1';
                const splitAmong = users.length ? users.map((u) => u.id) : [paidBy];
                tx = {
                  id: `tx-${Date.now()}`,
                  description: `Chi phí: ${location.name}`,
                  amount: parsedAmount,
                  paidBy,
                  splitAmong,
                  category: 'Hoạt Động',
                  linkedActivity: id,
                  date,
                };
              }

              onCreate(item, tx);
              toast.success('Đã thêm vào lịch trình', { description: location.name });
              onOpenChange(false);
              reset();
            }}
          >
            Thêm vào lịch trình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

