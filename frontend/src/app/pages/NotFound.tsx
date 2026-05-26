import { Link } from 'react-router';
import { Home, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div
      role="alert"
      className="flex min-h-full flex-col items-center justify-center px-[var(--vj-page-pad-x)] py-[var(--vj-stack-gap)] bg-gradient-to-b from-[var(--vj-bg)] to-[var(--vj-primary)]/35"
    >
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[var(--vj-border)] bg-[var(--vj-surface)]/95 px-8 py-10 text-center shadow-[var(--vj-shadow-premium)] backdrop-blur-sm">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--vj-primary)_12%,white)]">
          <MapPin className="h-10 w-10 text-[var(--vj-primary)] opacity-80" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--vj-primary)] opacity-85">
          Không tìm thấy
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">404</h1>
        <p className="mt-4 text-lg font-semibold text-slate-800">Trang này chưa tồn tại hoặc đã đổi địa chỉ.</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Quay lại khám phá địa điểm hoặc vào chuyến đi của bạn để tiếp tục lập lịch.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white font-semibold">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Về Khám phá
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[var(--vj-primary)]/30 text-[var(--vj-primary)] font-semibold">
            <Link to="/mytrip">Chuyến đi của tôi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
