import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Bookmark,
  CalendarDays,
  Eye,
  EyeOff,
  Check,
  Lock,
  Navigation,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  login,
  register,
  saveAuthToken,
  type LoginInput,
  type RegisterInput,
} from "../lib/authApi";
import { defaultAuthHeroVideo } from "../lib/mediaConfig";
import { cn } from "../lib/utils";

type AuthMode = "login" | "signup";

interface AuthPageProps {
  initialMode?: AuthMode;
  onAuthenticated: () => void;
}

const heroImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88";
const heroVideo = (import.meta.env.VITE_AUTH_HERO_VIDEO as string | undefined) || defaultAuthHeroVideo;

const authCopy = {
  login: {
    title: "Chào mừng trở lại!",
    subtitle: "Đăng nhập để tiếp tục hành trình của bạn",
    submit: "Đăng nhập",
    loading: "Đang đăng nhập...",
    switchText: "Chưa có tài khoản?",
    switchAction: "Đăng ký ngay",
  },
  signup: {
    title: "Tạo tài khoản",
    subtitle: "Lưu chuyến đi và nhận gợi ý địa điểm phù hợp với bạn",
    submit: "Tạo tài khoản",
    loading: "Đang tạo tài khoản...",
    switchText: "Đã có tài khoản?",
    switchAction: "Đăng nhập",
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthPage({ initialMode = "login", onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const copy = authCopy[mode];

  function switchMode(nextMode: AuthMode) {
    if (nextMode !== mode) {
      setMode(nextMode);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(214,205,255,0.56),transparent_32%),radial-gradient(circle_at_92%_54%,rgba(128,151,255,0.56),transparent_42%),linear-gradient(135deg,oklch(0.55_0.13_278),oklch(0.52_0.15_268)_48%,oklch(0.45_0.13_252))] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/45 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] lg:min-h-[720px] lg:grid-cols-[minmax(430px,0.86fr)_minmax(0,1.14fr)]">
        <section className="relative flex min-h-[620px] items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="auth-card-scroll w-full max-w-[480px] pr-8 lg:max-h-[calc(100dvh-96px)] lg:overflow-y-auto lg:pl-1 lg:pr-12">
            <BrandMark compact />

            <div className="mt-8 grid grid-cols-2 rounded-xl border border-primary/20 bg-primary/5 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                  mode === "signup" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-slate-500 hover:bg-white/70 hover:text-primary",
                )}
              >
                Đăng ký
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                  mode === "login" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-slate-500 hover:bg-white/70 hover:text-primary",
                )}
              >
                Đăng nhập
              </button>
            </div>

            <div key={`auth-${mode}`} className="auth-panel-in mt-8">
              <header>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">VietJourney</p>
                <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.01em] text-slate-950 sm:text-[2.35rem]">
                  {copy.title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{copy.subtitle}</p>
              </header>

              <AuthForm mode={mode} onAuthenticated={onAuthenticated} />

              <p className="mt-6 text-center text-sm text-slate-500">
                {copy.switchText}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {copy.switchAction}
                </button>
              </p>

              <p className="mx-auto mt-5 max-w-[360px] text-center text-xs leading-5 text-slate-500">
                <button type="button" className="font-medium text-primary hover:text-primary/80">
                  Điều khoản
                </button>{" "}
                và{" "}
                <button type="button" className="font-medium text-primary hover:text-primary/80">
                  Chính sách bảo mật
                </button>
              </p>
            </div>
          </div>
        </section>

        <HeroPanel />
      </div>
    </main>
  );
}

function HeroPanel() {
  return (
    <aside className="relative hidden min-h-[720px] overflow-hidden p-4 lg:block">
      <div className="auth-side-in relative h-full overflow-hidden rounded-[24px] bg-slate-950">
        {heroVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={heroImage}
            className="absolute inset-0 size-full object-cover"
          >
            <source src={heroVideo} />
          </video>
        ) : (
          <img
            src={heroImage}
            alt="Người du lịch đứng trên núi nhìn xuống thung lũng"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.12)_42%,rgba(15,23,42,0.58))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.24),transparent_24%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_48%)]" />

        <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
          <div className="ml-auto rounded-2xl border border-white/25 bg-white/88 px-4 py-3 text-slate-950 shadow-xl backdrop-blur">
            <p className="text-xs font-bold">Wonder. Explore.</p>
            <p className="mt-1 max-w-[170px] text-[11px] leading-4 text-slate-600">
              Tạo lịch trình gọn hơn từ những địa điểm bạn đã lưu.
            </p>
          </div>

          <div className="mt-auto max-w-[390px] text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/75">Journey begins</p>
            <h2 className="mt-3 text-[2.8rem] font-bold leading-[1.02] tracking-[-0.03em] xl:text-[3.3rem]">
              Khám phá Việt Nam theo cách riêng.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/78">
              Lưu địa điểm, kéo thả vào lịch và theo dõi chuyến đi trong một không gian nhẹ nhàng.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <HeroFeature icon={Bookmark} title="Lưu" text="Địa điểm" />
            <HeroFeature icon={CalendarDays} title="Lịch" text="Kế hoạch" />
            <HeroFeature icon={Users} title="Nhóm" text="Đồng hành" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4", compact && "justify-center")}>
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_18px_rgba(84,78,226,0.18)]",
          compact ? "size-12" : "size-14",
        )}
      >
        <Navigation className={cn("-translate-x-0.5 rotate-[18deg]", compact ? "size-7" : "size-8")} />
      </span>
      <span>
        <span className={cn("block font-bold leading-tight text-slate-950", compact ? "text-xl" : "text-2xl")}>
          VietJourney
        </span>
        <span className="block text-xs font-medium text-slate-600 sm:text-sm">Travel planner for Vietnam</span>
      </span>
    </div>
  );
}

function AuthForm({
  mode,
  onAuthenticated,
}: {
  mode: AuthMode;
  onAuthenticated: () => void;
}) {
  const [loginForm, setLoginForm] = useState<LoginInput>({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState<RegisterInput & { confirmPassword: string }>({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = authCopy[mode];

  useEffect(() => {
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const passwordStrength = useMemo(() => {
    const password = signupForm.password;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    return score;
  }, [signupForm.password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "login") {
      await submitLogin();
      return;
    }

    await submitSignup();
  }

  async function submitLogin() {
    setSubmitting(true);
    try {
      const result = await login({
        username: loginForm.username.trim(),
        password: loginForm.password,
      });
      saveAuthToken(result.token);
      onAuthenticated();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Không đăng nhập được.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignup() {
    const username = signupForm.username.trim();
    const displayName = signupForm.displayName.trim();

    if (!displayName) {
      setError("Vui lòng nhập tên hiển thị.");
      return;
    }
    if (username.length < 5 || username.length > 30) {
      setError("Tên đăng nhập phải từ 5 đến 30 ký tự.");
      return;
    }
    if (/\s/.test(username)) {
      setError("Tên đăng nhập không được chứa khoảng trắng.");
      return;
    }
    if (
      signupForm.password.length < 8 ||
      !/[a-zA-Z]/.test(signupForm.password) ||
      !/\d/.test(signupForm.password)
    ) {
      setError("Mật khẩu phải tối thiểu 8 ký tự và có cả chữ lẫn số.");
      return;
    }
    if (/\s/.test(signupForm.password)) {
      setError("Mật khẩu không được chứa khoảng trắng.");
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!accepted) {
      setError("Bạn cần đồng ý điều khoản sử dụng.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        displayName,
        username,
        password: signupForm.password,
      });
      const result = await login({ username, password: signupForm.password });
      saveAuthToken(result.token);
      onAuthenticated();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Không tạo được tài khoản.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {error ? <AuthError message={error} /> : null}

      <div key={`fields-${mode}`} className="auth-panel-in grid gap-4">
        {mode === "signup" ? (
          <AuthInput
            label="Tên hiển thị"
            icon={UserRound}
            value={signupForm.displayName}
            onChange={(displayName) => setSignupForm({ ...signupForm, displayName })}
            placeholder="Ví dụ: Nguyễn Minh An"
            autoComplete="name"
          />
        ) : null}

        <AuthInput
          label="Tên đăng nhập"
          icon={UserRound}
          value={mode === "login" ? loginForm.username : signupForm.username}
          onChange={(username) =>
            mode === "login"
              ? setLoginForm({ ...loginForm, username })
              : setSignupForm({ ...signupForm, username })
          }
          placeholder={mode === "login" ? "Nhập tên đăng nhập" : "Từ 5-30 ký tự, không khoảng trắng"}
          autoComplete="username"
        />

        <AuthInput
          label="Mật khẩu"
          icon={Lock}
          value={mode === "login" ? loginForm.password : signupForm.password}
          onChange={(password) =>
            mode === "login"
              ? setLoginForm({ ...loginForm, password })
              : setSignupForm({ ...signupForm, password })
          }
          placeholder="Nhập mật khẩu"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          helper={
            mode === "signup"
              ? "Tối thiểu 8 ký tự, có chữ và số, không chứa khoảng trắng."
              : undefined
          }
          endAdornment={
            <PasswordToggle
              visible={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            />
          }
        />

        {mode === "signup" ? (
          <>
            <PasswordStrength score={passwordStrength} />
            <AuthInput
              label="Xác nhận mật khẩu"
              icon={Lock}
              value={signupForm.confirmPassword}
              onChange={(confirmPassword) =>
                setSignupForm({ ...signupForm, confirmPassword })
              }
              placeholder="Nhập lại mật khẩu"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              endAdornment={
                <PasswordToggle
                  visible={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <label className="flex items-start gap-3 rounded-xl bg-primary/5 px-3 py-2.5 text-sm leading-6 text-slate-600">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="peer sr-only"
              />
              <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-white transition peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                {accepted ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span>
                Tôi đồng ý với <span className="text-primary">điều khoản</span>.
              </span>
            </label>
          </>
        ) : (
          <div className="-mt-3 flex justify-end">
            <button
              type="button"
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Quên mật khẩu?
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-[52px] w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-[0_15px_28px_rgba(84,78,226,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(84,78,226,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {submitting ? copy.loading : copy.submit}
      </button>
    </form>
  );
}

function HeroFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/16 text-violet-100">
        <Icon className="size-5" />
      </span>
      <span className="mt-3 block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-white/76">{text}</span>
    </div>
  );
}

function AuthInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  helper,
  endAdornment,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  helper?: string;
  endAdornment?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-950">{label}</span>
      <span className="mt-2.5 flex h-[54px] items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 text-slate-500 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <Icon className="size-5 shrink-0" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
        />
        {endAdornment}
      </span>
      {helper ? <span className="mt-2 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

function PasswordToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      onClick={onClick}
      className="text-slate-500 transition-colors hover:text-slate-900"
    >
      {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}

function PasswordStrength({ score }: { score: number }) {
  const label = ["Chưa nhập", "Yếu", "Ổn", "Tốt", "Mạnh"][score];
  const color = ["bg-slate-200", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"][score];

  return (
    <div className="-mt-2">
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={cn("h-1 rounded-full", index < score ? color : "bg-slate-200")}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Độ mạnh mật khẩu: {label}</p>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {translateAuthError(message)}
    </div>
  );
}

function translateAuthError(message: string) {
  const dictionary: Record<string, string> = {
    "Unexist Account": "Tài khoản không tồn tại.",
    "Incorrect Username or Password": "Tên đăng nhập hoặc mật khẩu không đúng.",
    "User already exists!": "Tài khoản đã tồn tại.",
    "This username already existed": "Tên đăng nhập đã tồn tại.",
    "Username must be between 5 and 30 characters": "Tên đăng nhập phải từ 5 đến 30 ký tự.",
    "Username must not contain space [_]": "Tên đăng nhập không được chứa khoảng trắng.",
    "Password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự.",
    "Password must contain at least one digit": "Mật khẩu phải có ít nhất một chữ số.",
    "Password must contain at least one letter": "Mật khẩu phải có ít nhất một chữ cái.",
  };

  return dictionary[message] || message;
}
