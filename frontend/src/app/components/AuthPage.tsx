import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Map,
  Navigation,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import logoUrl from "../../../photos/Vietjourney_logo.png";
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

const bayImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=85";

const authCopy = {
  login: {
    title: "Đăng nhập",
    subtitle: "Dùng tài khoản VietJourney của bạn để tiếp tục.",
    sideTitle: "Chào mừng trở lại",
    sideText: "Đăng nhập để tiếp tục lên kế hoạch và khám phá những hành trình tuyệt vời.",
    submit: "Đăng nhập",
    loading: "Đang đăng nhập...",
    switchText: "Chưa có tài khoản?",
    switchAction: "Đăng ký ngay",
    divider: "hoặc",
  },
  signup: {
    title: "Tạo tài khoản",
    subtitle: "Một tài khoản để lưu chuyến đi và cá nhân hóa gợi ý địa điểm.",
    sideTitle: "Bắt đầu hành trình của bạn",
    sideText: "Tạo tài khoản để lưu chuyến đi, cộng tác với bạn bè và khám phá địa điểm mới.",
    submit: "Tạo tài khoản",
    loading: "Đang tạo tài khoản...",
    switchText: "Đã có tài khoản?",
    switchAction: "Đăng nhập",
    divider: "hoặc đăng ký với",
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
    <main className="relative min-h-dvh overflow-x-hidden bg-[#f5faff] text-foreground">
      <div
        className="absolute inset-y-0 right-0 hidden w-[46%] bg-cover bg-center lg:block"
        style={{ backgroundImage: `url(${bayImage})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 hidden w-[52%] bg-[linear-gradient(90deg,#f5faff_0%,rgba(245,250,255,0.82)_18%,rgba(245,250,255,0.08)_58%)] lg:block" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_8%,rgba(84,78,226,0.14),transparent_26%),radial-gradient(circle_at_72%_18%,rgba(125,190,255,0.22),transparent_30%)]" />
      <div className="absolute bottom-0 left-0 hidden h-56 w-[42%] rounded-tr-[70%] bg-[linear-gradient(180deg,rgba(221,234,255,0.18),rgba(185,207,255,0.42))] lg:block" />

      <section className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[1520px] items-center gap-7 px-5 py-5 sm:px-8 lg:grid-cols-[360px_minmax(540px,660px)_1fr] lg:px-10 xl:grid-cols-[390px_minmax(580px,680px)_1fr]">
        <aside className="auth-side-in hidden lg:block">
          <Navigation className="mb-12 ml-36 size-11 rotate-[24deg] text-primary/70 drop-shadow-[0_12px_18px_rgba(84,78,226,0.28)]" />
          <div key={`side-${mode}`} className="auth-copy-in">
            <h1 className="max-w-[330px] text-[2.35rem] font-bold leading-tight text-slate-950">
              {copy.sideTitle}
            </h1>
            <p className="mt-5 max-w-[320px] text-base leading-8 text-slate-600">
              {copy.sideText}
            </p>
          </div>

          <div className="mt-10 grid gap-7">
            <AuthFeature
              icon={Map}
              iconClassName="bg-indigo-50 text-primary"
              title="Lên kế hoạch dễ dàng"
              text="Tạo timeline và sắp xếp hành trình khoa học."
            />
            <AuthFeature
              icon={Users}
              iconClassName="bg-emerald-50 text-emerald-600"
              title="Cộng tác cùng bạn bè"
              text="Chia sẻ kế hoạch và cùng nhau trải nghiệm."
            />
            <AuthFeature
              icon={Star}
              iconClassName="bg-orange-50 text-orange-500"
              title="Khám phá địa điểm"
              text="Tìm kiếm và lưu lại những địa điểm độc đáo."
            />
          </div>
        </aside>

        <div className="mx-auto w-full">
          <div className="auth-card-scroll rounded-[30px] bg-white/95 px-5 py-6 shadow-[0_26px_80px_rgba(38,55,91,0.15)] ring-1 ring-white/80 backdrop-blur-xl sm:px-8 sm:py-7 lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto lg:px-10">
            <div className="flex items-start justify-between gap-4">
              <img src={logoUrl} alt="VietJourney" className="h-16 w-auto object-contain sm:h-[74px]" />
              <div className="relative grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <span
                  className={cn(
                    "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out",
                    mode === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-0",
                  )}
                  aria-hidden="true"
                />
                <ModeButton active={mode === "login"} onClick={() => switchMode("login")}>
                  Đăng nhập
                </ModeButton>
                <ModeButton active={mode === "signup"} onClick={() => switchMode("signup")}>
                  Đăng ký
                </ModeButton>
              </div>
            </div>

            <div key={`heading-${mode}`} className="auth-panel-in mt-6 text-center">
              <h2 className="text-4xl font-bold leading-tight text-slate-950 sm:text-[2.65rem]">
                {copy.title}
              </h2>
              <p className="mx-auto mt-3 max-w-[520px] text-base leading-7 text-slate-600">
                {copy.subtitle}
              </p>
            </div>

            <AuthForm mode={mode} onAuthenticated={onAuthenticated} />

            <SocialDivider label={copy.divider} />
            <SocialButtons />

            <p className="mt-5 text-center text-sm text-slate-500">
              {copy.switchText}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {copy.switchAction}
              </button>
            </p>
          </div>

          <SecurityNote />
        </div>
      </section>
    </main>
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
    <form onSubmit={submit} className="mt-7 space-y-4">
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
          label={mode === "login" ? "Tên đăng nhập" : "Email hoặc tên đăng nhập"}
          icon={mode === "login" ? UserRound : Mail}
          value={mode === "login" ? loginForm.username : signupForm.username}
          onChange={(username) =>
            mode === "login"
              ? setLoginForm({ ...loginForm, username })
              : setSignupForm({ ...signupForm, username })
          }
          placeholder={mode === "login" ? "Email hoặc tên đăng nhập" : "Từ 5-30 ký tự, không khoảng trắng"}
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
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>
                Tôi đồng ý với <span className="text-primary">Điều khoản sử dụng</span> và{" "}
                <span className="text-primary">Chính sách bảo mật</span>.
              </span>
            </label>
          </>
        ) : (
          <div className="-mt-1 flex justify-end">
            <button
              type="button"
              className="text-sm font-semibold text-orange-500 transition-colors hover:text-orange-600"
            >
              Quên mật khẩu?
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_15px_34px_rgba(84,78,226,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(84,78,226,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {submitting ? copy.loading : copy.submit}
      </button>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative z-10 h-9 min-w-[92px] rounded-xl px-4 text-sm font-semibold transition-colors duration-200",
        active ? "text-slate-950" : "text-slate-500 hover:text-slate-900",
      )}
    >
      {children}
    </button>
  );
}

function AuthFeature({
  icon: Icon,
  iconClassName,
  title,
  text,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-5">
      <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm", iconClassName)}>
        <Icon className="size-7" />
      </span>
      <span>
        <span className="block text-base font-bold text-slate-950">{title}</span>
        <span className="mt-1 block max-w-[250px] text-sm leading-6 text-slate-600">{text}</span>
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
      <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.02)] transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <Icon className="size-5 shrink-0" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {endAdornment}
      </span>
      {helper ? <span className="mt-1.5 block text-xs text-slate-500">{helper}</span> : null}
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
    <div className="-mt-1">
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

function SocialDivider({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-center gap-4 text-sm text-slate-500">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled
        title="Backend hiện tại chưa có OAuth Google"
        className="flex h-11 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-950 opacity-75"
      >
        <span className="text-lg font-bold text-red-500">G</span>
        Tiếp tục với Google
      </button>
      <button
        type="button"
        disabled
        title="Backend hiện tại chưa có OAuth Facebook"
        className="flex h-11 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-950 opacity-75"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          f
        </span>
        Tiếp tục với Facebook
      </button>
    </div>
  );
}

function SecurityNote() {
  return (
    <div className="mx-auto mt-5 flex max-w-[430px] items-center justify-center gap-3 text-center text-xs leading-relaxed text-slate-500">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_24px_rgba(16,185,129,0.22)]">
        <ShieldCheck className="size-5" />
      </span>
      <span>Thông tin của bạn được bảo mật tuyệt đối và chỉ sử dụng cho mục đích cá nhân.</span>
    </div>
  );
}
