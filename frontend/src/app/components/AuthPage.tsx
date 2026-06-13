import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Bookmark,
  CalendarDays,
  Eye,
  EyeOff,
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
import { cn } from "../lib/utils";

type AuthMode = "login" | "signup";

interface AuthPageProps {
  initialMode?: AuthMode;
  onAuthenticated: () => void;
}

const heroImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88";

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
    <main className="grid min-h-dvh bg-white text-slate-950 lg:grid-cols-[minmax(520px,0.93fr)_minmax(560px,1.07fr)]">
      <HeroPanel />

      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="auth-card-scroll w-full max-w-[540px] lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto lg:px-1">
          <div key={`auth-${mode}`} className="auth-panel-in">
            <header className="text-center">
              <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.01em] text-slate-950 sm:text-[2.45rem]">
                {copy.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{copy.subtitle}</p>
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
    </main>
  );
}

function HeroPanel() {
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden lg:block">
      <img
        src={heroImage}
        alt="Người du lịch đứng trên núi nhìn xuống thung lũng"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(15,23,42,0.16)_45%,rgba(15,23,42,0.5))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.36),rgba(255,255,255,0.02)_46%,rgba(0,0,0,0.08))]" />

      <div className="relative z-10 flex min-h-dvh flex-col px-16 py-12 xl:px-20">
        <BrandMark />

        <div className="mt-24 max-w-[560px]">
          <h2 className="text-[3.05rem] font-bold leading-[1.02] tracking-[-0.02em] text-slate-950 drop-shadow-[0_2px_18px_rgba(255,255,255,0.3)] xl:text-[3.4rem]">
            Lên kế hoạch
          </h2>
          <p className="mt-3 font-['Segoe_Script','Brush_Script_MT',cursive] text-[2.35rem] leading-tight text-primary drop-shadow-[0_8px_22px_rgba(84,78,226,0.32)] xl:text-[2.65rem]">
            Dễ hơn mỗi ngày
          </p>
        </div>

        <div className="mt-auto w-full max-w-[475px] rounded-2xl border border-white/70 bg-white/[0.035] p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-[2px]">
          <HeroFeature
            icon={Bookmark}
            title="Lưu địa điểm yêu thích"
            text="Lưu lại những nơi bạn muốn đến."
          />
          <HeroFeature
            icon={CalendarDays}
            title="Lên lịch trình thông minh"
            text="Sắp xếp hành trình tối ưu theo thời gian của bạn."
          />
          <HeroFeature
            icon={Users}
            title="Cùng nhau khám phá"
            text="Chia sẻ chuyến đi và đồng hành cùng bạn bè."
          />
        </div>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_18px_42px_rgba(84,78,226,0.35)]">
        <Navigation className="size-8 -translate-x-0.5 rotate-[18deg]" />
      </span>
      <span>
        <span className="block text-2xl font-bold leading-tight text-slate-950">VietJourney</span>
        <span className="block text-sm font-medium text-slate-600">Travel planner for Vietnam</span>
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
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
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
    <div className="flex items-center gap-5 py-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/65 bg-white/[0.04] text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        <Icon className="size-6" />
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-white/82">{text}</span>
      </span>
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
