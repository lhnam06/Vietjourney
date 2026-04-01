import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--vj-bg)]">
        <div className="rounded-2xl bg-white/90 px-5 py-4 shadow-lg border border-slate-200">
          <div className="text-sm font-extrabold text-[var(--vj-primary)]">Đang kiểm tra phiên đăng nhập…</div>
          <div className="text-xs text-slate-600 mt-1">Vui lòng chờ trong giây lát.</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}

