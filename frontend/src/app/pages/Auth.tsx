import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { User, KeyRound, IdCard, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { toast } from 'sonner';
import logoUrl from '../../../photos/Vietjourney_logo.png';

function getErrorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Vui lòng thử lại.';
}

const PASSWORD_HINT =
  'Tối thiểu 8 ký tự: chữ hoa, chữ thường, số và ký tự đặc biệt, không dấu cách.';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, signInWithPassword, signUp } = useAuth();

  const nextUrl = useMemo(() => {
    const next = searchParams.get('next');
    return next && next.startsWith('/') ? next : '/';
  }, [searchParams]);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(nextUrl, { replace: true });
  }, [isAuthenticated, loading, navigate, nextUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (password !== password2) {
        toast.error('Mật khẩu xác nhận không khớp');
        return;
      }
      if (displayName.trim().length < 1) {
        toast.error('Vui lòng nhập tên hiển thị');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        await signInWithPassword(username.trim(), password);
        toast.success('Đăng nhập thành công');
      } else {
        await signUp({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
        });
        toast.success('Tài khoản đã được tạo', { description: 'Bạn đã được đăng nhập tự động.' });
      }
      navigate(nextUrl, { replace: true });
    } catch (err) {
      toast.error(isLogin ? 'Không thể đăng nhập' : 'Không thể tạo tài khoản', {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 bg-[var(--vj-bg)] text-[var(--vj-text-on-dark)]">
      {/* Quiet backdrop — static gradient + pattern, no looping animation */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[var(--vj-bg)]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--vj-primary)]/25 via-transparent to-[var(--vj-bg-2)]/40" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '220px 220px',
          }}
        />
        <div className="absolute bottom-0 left-1/2 h-[38vh] w-[min(100%,48rem)] -translate-x-1/2 rounded-[100%] bg-[var(--vj-accent)]/5 blur-3xl" />
      </div>

      <div className="w-full max-w-[26rem] relative">
        <div className="mb-4">
          <Button
            variant="ghost"
            className="px-0 text-[var(--vj-text-on-dark-muted)] hover:text-[var(--vj-text-on-dark)] hover:bg-white/5 gap-1.5"
            asChild
          >
            <Link to={nextUrl === '/' ? '/' : nextUrl}>
              <ArrowLeft className="w-4 h-4 opacity-80" />
              Về ứng dụng
            </Link>
          </Button>
        </div>

        <Card className="border border-white/20 bg-[var(--vj-surface)] text-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.14)] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="inline-flex h-[4.5rem] sm:h-16 w-full max-w-[18rem] items-center justify-center rounded-xl bg-white/80 px-4 py-2 border border-slate-200/90 shadow-sm">
              <img
                src={logoUrl}
                alt="Vietjourney"
                className="h-12 sm:h-14 w-auto object-contain object-center max-h-full"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                {isLogin
                  ? 'Dùng tên đăng nhập Vietjourney của bạn để tiếp tục lên kế hoạch.'
                  : 'Một tài khoản để lưu chuyến đi và tùy chọn cá nhân.'}
              </p>
            </div>
          </div>

          <Separator className="my-6 bg-slate-200/90" />

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-800 text-sm font-medium">
                  Tên hiển thị
                </Label>
                <div className="relative">
                  <IdCard
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-[1.1rem] h-[1.1rem] text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Ví dụ: Nguyễn Minh An"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--vj-primary)35%,white)]"
                    maxLength={50}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-800 text-sm font-medium">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-[1.1rem] h-[1.1rem] text-slate-400"
                  strokeWidth={1.75}
                />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="5–30 ký tự, không khoảng trắng"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--vj-primary)35%,white)]"
                  minLength={5}
                  maxLength={30}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 text-sm font-medium">
                Mật khẩu
              </Label>
              <div className="relative">
                <KeyRound
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-[1.1rem] h-[1.1rem] text-slate-400"
                  strokeWidth={1.75}
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="Mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--vj-primary)35%,white)]"
                  required
                />
              </div>
              {!isLogin && <p className="text-xs text-slate-500 leading-snug pl-0.5">{PASSWORD_HINT}</p>}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="password2" className="text-slate-800 text-sm font-medium">
                  Xác nhận mật khẩu
                </Label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-[1.1rem] h-[1.1rem] text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="password2"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="pl-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--vj-primary)35%,white)]"
                    required
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end -mt-1">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm text-[var(--vj-accent)] hover:text-[var(--vj-accent-2)] no-underline hover:underline"
                  onClick={() =>
                    toast('Tính năng đang phát triển', {
                      description: 'Liên hệ quản trị nếu cần đặt lại mật khẩu.',
                    })
                  }
                >
                  Quên mật khẩu?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-lg font-medium bg-[var(--vj-primary)] text-white hover:bg-[var(--vj-primary-2)] shadow-sm"
              disabled={loading || submitting}
            >
              {submitting ? 'Đang xử lý…' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              type="button"
              className="font-medium text-[var(--vj-accent)] hover:text-[var(--vj-accent-2)]"
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword2('');
              }}
            >
              {isLogin ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </p>
        </Card>

        <p className="text-center text-xs text-[var(--vj-text-on-dark-muted)] mt-5 max-w-[24rem] mx-auto leading-relaxed">
          Khi tiếp tục, bạn đồng ý với điều khoản sử dụng và cách chúng tôi xử lý dữ liệu cá nhân.
        </p>
      </div>
    </div>
  );
}
