import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Cloud,
  Database,
  Globe2,
  KeyRound,
  Languages,
  Lock,
  Mail,
  MapPin,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { changeDisplayName, changePassword } from "../lib/authApi";
import { fetchCurrentUser, type CurrentUser } from "../lib/timelineApi";
import { cn } from "../lib/utils";

type SettingsSection =
  | "account"
  | "security"
  | "notifications"
  | "appearance"
  | "region"
  | "privacy"
  | "storage"
  | "connections"
  | "about";

type ThemeChoice = "light" | "dark" | "system";

interface ToggleState {
  push: boolean;
  tripEmail: boolean;
  community: boolean;
  recommendations: boolean;
}

const ACCOUNT_BIO_STORAGE_KEY = "vj:account-bio:v1";
const defaultBio =
  "Lưu lại địa điểm hay, biến chúng thành lịch trình rõ ràng, rồi rủ bạn bè cùng chốt từng chặng đi khắp Việt Nam.";

const settingsNav: {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "account", label: "Tài khoản", icon: UserRound },
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "appearance", label: "Giao diện", icon: Palette },
  { id: "region", label: "Ngôn ngữ & Khu vực", icon: Globe2 },
  { id: "privacy", label: "Quyền riêng tư", icon: Lock },
  { id: "storage", label: "Dữ liệu & Lưu trữ", icon: Database },
  { id: "connections", label: "Kết nối", icon: Wifi },
  { id: "about", label: "Về VietJourney", icon: Cloud },
];

const themeOptions = [
  { value: "light" as const, label: "Sáng", icon: Sun },
  { value: "dark" as const, label: "Tối", icon: Moon },
  { value: "system" as const, label: "Theo hệ thống", icon: Smartphone },
];

const accentColors = [
  { label: "Màu xanh VietJourney", className: "bg-primary" },
  { label: "Xanh biển", className: "bg-blue-500" },
  { label: "Xanh trời", className: "bg-sky-500" },
  { label: "Cyan", className: "bg-cyan-500" },
  { label: "Indigo", className: "bg-indigo-500" },
  { label: "Slate", className: "bg-slate-400" },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [accountForm, setAccountForm] = useState({
    displayName: "",
    bio:
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACCOUNT_BIO_STORAGE_KEY) || defaultBio
        : defaultBio,
  });
  const [toggles, setToggles] = useState<ToggleState>({
    push: true,
    tripEmail: true,
    community: true,
    recommendations: false,
  });
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>("light");
  const [selectedAccent, setSelectedAccent] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((nextUser) => {
        setUser(nextUser);
        setAccountForm((current) => ({
          ...current,
          displayName: nextUser.displayName || nextUser.username || "",
        }));
      })
      .catch(() => setUser(null))
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingUser(false);
        }
      });

    return () => controller.abort();
  }, []);

  const displayName = user?.displayName || user?.username || "Nhà du hành";
  const username = user?.username ? `@${user.username}` : "@vietjourney";
  const passwordScore = useMemo(() => {
    const password = passwordForm.newPassword;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    return score;
  }, [passwordForm.newPassword]);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus(null);

    if (!passwordForm.oldPassword) {
      setPasswordStatus({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordStatus({ type: "error", message: "Mật khẩu mới cần ít nhất 8 ký tự." });
      return;
    }

    if (!/[a-zA-Z]/.test(passwordForm.newPassword) || !/\d/.test(passwordForm.newPassword)) {
      setPasswordStatus({
        type: "error",
        message: "Mật khẩu mới cần có cả chữ và số.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: "error", message: "Xác nhận mật khẩu chưa khớp." });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStatus({
        type: "success",
        message: "Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo.",
      });
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Không thể đổi mật khẩu lúc này.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  function updateToggle(key: keyof ToggleState) {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountStatus(null);

    const nextDisplayName = accountForm.displayName.trim();
    const nextBio = accountForm.bio.trim() || defaultBio;

    if (!nextDisplayName) {
      setAccountStatus({ type: "error", message: "Vui lòng nhập họ và tên hiển thị." });
      return;
    }

    if (nextDisplayName.length > 50) {
      setAccountStatus({ type: "error", message: "Họ và tên tối đa 50 ký tự." });
      return;
    }

    try {
      setIsSavingAccount(true);
      const nextUser = await changeDisplayName({ displayName: nextDisplayName });
      window.localStorage.setItem(ACCOUNT_BIO_STORAGE_KEY, nextBio);
      setUser(nextUser);
      setAccountForm({ displayName: nextUser.displayName || nextUser.username || nextDisplayName, bio: nextBio });
      setIsEditingAccount(false);
      setAccountStatus({
        type: "success",
        message: "Đã cập nhật thông tin tài khoản.",
      });
    } catch (error) {
      window.localStorage.setItem(ACCOUNT_BIO_STORAGE_KEY, nextBio);
      setAccountForm((current) => ({ ...current, bio: nextBio }));
      setAccountStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật tài khoản lúc này.",
      });
    } finally {
      setIsSavingAccount(false);
    }
  }

  function cancelAccountEdit() {
    setIsEditingAccount(false);
    setAccountStatus(null);
    setAccountForm({
      displayName: user?.displayName || user?.username || "",
      bio: window.localStorage.getItem(ACCOUNT_BIO_STORAGE_KEY) || defaultBio,
    });
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[linear-gradient(135deg,oklch(0.99_0.004_255),oklch(0.965_0.018_260))]">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            VietJourney
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Cài đặt
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Quản lý tài khoản, bảo mật và những tuỳ chọn giúp trải nghiệm lập kế hoạch du lịch
            gọn gàng hơn.
          </p>
        </header>

        <div className="mt-7 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_430px]">
          <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm xl:sticky xl:top-6 xl:h-fit">
            {settingsNav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  "flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold transition",
                  activeSection === id
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </aside>

          <section className="space-y-5">
            <SettingsCard title="Thông tin tài khoản">
              <form onSubmit={handleSaveAccount}>
                <div className="grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img
                        src="/avatar.png"
                        alt={displayName}
                        className="size-28 rounded-full object-cover ring-4 ring-accent"
                      />
                      <button
                        type="button"
                        aria-label="Đổi ảnh đại diện"
                        onClick={() =>
                          setAccountStatus({
                            type: "info",
                            message: "Ảnh đại diện sẽ được bật khi backend hỗ trợ upload hồ sơ.",
                          })
                        }
                        className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5"
                      >
                        <Camera className="size-4" />
                      </button>
                    </div>
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
                      Explorer
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Họ và tên"
                        value={
                          isEditingAccount
                            ? accountForm.displayName
                            : isLoadingUser
                              ? "Đang tải..."
                              : displayName
                        }
                        disabled={!isEditingAccount || isLoadingUser}
                        onChange={(displayName) =>
                          setAccountForm((current) => ({ ...current, displayName }))
                        }
                      />
                      <TextField label="Tên người dùng" value={username} disabled />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <ReadonlyFact
                        label="Trạng thái"
                        value="Tài khoản VietJourney"
                        badge="Đã đăng nhập"
                      />
                      <ReadonlyFact label="Ngày tham gia" value="Thành viên hiện tại" />
                    </div>

                    <label className="block rounded-2xl border border-border bg-background p-4">
                      <span className="text-sm font-bold text-foreground">Giới thiệu bản thân</span>
                      {isEditingAccount ? (
                        <textarea
                          value={accountForm.bio}
                          onChange={(event) =>
                            setAccountForm((current) => ({ ...current, bio: event.target.value }))
                          }
                          maxLength={180}
                          className="mt-3 min-h-28 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                          {accountForm.bio}
                        </p>
                      )}
                      <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                        {accountForm.bio.length}/180 ký tự
                      </span>
                    </label>

                    {accountStatus ? (
                      <div
                        className={cn(
                          "rounded-xl border p-3 text-sm font-semibold",
                          accountStatus.type === "success" &&
                            "border-blue-200 bg-blue-50 text-blue-700",
                          accountStatus.type === "info" &&
                            "border-border bg-accent text-primary",
                          accountStatus.type === "error" &&
                            "border-destructive/30 bg-destructive/10 text-destructive",
                        )}
                      >
                        {accountStatus.message}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                      {isEditingAccount ? (
                        <>
                          <button
                            type="button"
                            onClick={cancelAccountEdit}
                            className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:bg-accent"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingAccount}
                            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_14px_30px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingAccount ? "Đang lưu..." : "Lưu thay đổi"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountStatus(null);
                            setIsEditingAccount(true);
                          }}
                          className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:bg-accent hover:text-primary"
                        >
                          Chỉnh sửa tài khoản
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard title="Bảo mật tài khoản" id="security">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-accent/45 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
                    <KeyRound className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-black text-foreground">Đổi mật khẩu</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Dùng mật khẩu mạnh để bảo vệ timeline, danh sách đã lưu và lời mời chuyến đi
                      của bạn.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <PasswordField
                    label="Mật khẩu hiện tại"
                    value={passwordForm.oldPassword}
                    autoComplete="current-password"
                    onChange={(oldPassword) =>
                      setPasswordForm((current) => ({ ...current, oldPassword }))
                    }
                  />
                  <PasswordField
                    label="Mật khẩu mới"
                    value={passwordForm.newPassword}
                    autoComplete="new-password"
                    onChange={(newPassword) =>
                      setPasswordForm((current) => ({ ...current, newPassword }))
                    }
                  />
                  <PasswordField
                    label="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    autoComplete="new-password"
                    onChange={(confirmPassword) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword }))
                    }
                  />
                </div>

                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={cn(
                          "h-2 rounded-full",
                          index < passwordScore ? "bg-primary" : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    Tối thiểu 8 ký tự, có chữ và số. Thêm ký tự đặc biệt để tăng độ mạnh.
                  </p>
                </div>

                {passwordStatus ? (
                  <div
                    className={cn(
                      "rounded-xl border p-3 text-sm font-semibold",
                      passwordStatus.type === "success"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    {passwordStatus.message}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                      setPasswordStatus(null);
                    }}
                    className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:bg-accent"
                  >
                    Xoá nhập liệu
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_14px_30px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChangingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard title="Tuỳ chọn tài khoản">
              <ActionRow
                icon={Mail}
                title="Email liên kết"
                description="Quản lý email dùng để đăng nhập khi backend hỗ trợ."
              />
              <ActionRow
                icon={Users}
                title="Quyền riêng tư chuyến đi"
                description="Chọn mặc định riêng tư, chia sẻ hoặc công khai cho timeline mới."
              />
              <ActionRow
                icon={Trash2}
                title="Xoá tài khoản"
                description="Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu."
                danger
              />
            </SettingsCard>

            <SettingsCard title="Tuỳ chọn ứng dụng">
              <PreferenceRow label="Đơn vị khoảng cách" value="Kilometer (km)" />
              <PreferenceRow label="Đơn vị nhiệt độ" value="Celsius (°C)" />
              <PreferenceRow label="Múi giờ" value="(GMT+07:00) Bangkok, Hanoi, Jakarta" />
            </SettingsCard>
          </section>

          <aside className="space-y-5">
            <SettingsCard title="Giao diện">
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map(({ value, label, icon: Icon }) => {
                  const active = selectedTheme === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedTheme(value)}
                      className={cn(
                        "group min-h-[148px] rounded-[18px] border p-4 text-center transition-all duration-200",
                        active
                          ? "border-primary/25 bg-primary/10 text-primary shadow-[inset_0_0_0_1px_oklch(0.515_0.22_277_/_0.2)] ring-2 ring-primary/15"
                          : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/45 hover:text-foreground",
                      )}
                    >
                      <Icon className="mx-auto mt-2 size-8" strokeWidth={active ? 2.4 : 2} />
                      <span className="mx-auto mt-4 block max-w-20 text-sm font-black leading-tight">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "mx-auto mt-4 flex size-5 items-center justify-center rounded-full border bg-card transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border group-hover:border-primary/40",
                        )}
                      >
                        {active ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm font-black text-foreground">Màu chủ đạo</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {accentColors.map((color, index) => (
                    <button
                      key={color.label}
                      type="button"
                      aria-label={color.label}
                      onClick={() => setSelectedAccent(index)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full shadow-sm transition hover:-translate-y-0.5",
                        color.className,
                        selectedAccent === index && "ring-4 ring-primary/20",
                      )}
                    >
                      {selectedAccent === index ? (
                        <Check className="size-4 text-primary-foreground" strokeWidth={3} />
                      ) : null}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold text-primary">
                  {accentColors[selectedAccent].label}
                </p>
              </div>
            </SettingsCard>

            <SettingsCard title="Thông báo">
              <div className="space-y-1">
                <ToggleRow
                  icon={Bell}
                  title="Thông báo đẩy"
                  description="Nhận thông báo trên thiết bị"
                  active={toggles.push}
                  onClick={() => updateToggle("push")}
                />
                <ToggleRow
                  icon={Mail}
                  title="Email về chuyến đi"
                  description="Nhận email cập nhật chuyến đi"
                  active={toggles.tripEmail}
                  onClick={() => updateToggle("tripEmail")}
                />
                <ToggleRow
                  icon={Users}
                  title="Hoạt động từ cộng đồng"
                  description="Thông báo khi có tương tác mới"
                  active={toggles.community}
                  onClick={() => updateToggle("community")}
                />
                <ToggleRow
                  icon={MapPin}
                  title="Khuyến nghị địa điểm"
                  description="Gợi ý địa điểm phù hợp sở thích"
                  active={toggles.recommendations}
                  onClick={() => updateToggle("recommendations")}
                />
              </div>
              <button className="mt-4 flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-primary transition hover:bg-accent">
                Quản lý cài đặt thông báo
                <ChevronRight className="size-4" />
              </button>
            </SettingsCard>

            <SettingsCard title="Ngôn ngữ & Khu vực">
              <PreferenceRow icon={Languages} label="Ngôn ngữ" value="Tiếng Việt" />
              <PreferenceRow icon={Globe2} label="Quốc gia/Khu vực" value="Việt Nam" />
              <PreferenceRow icon={CalendarDays} label="Định dạng ngày" value="DD/MM/YYYY" />
              <PreferenceRow icon={Clock} label="Định dạng thời gian" value="24 giờ" />
            </SettingsCard>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold text-muted-foreground">
          <span>VietJourney © 2026. All rights reserved.</span>
          <button className="text-primary">Điều khoản sử dụng</button>
          <button className="text-primary">Chính sách bảo mật</button>
        </footer>
      </div>
    </main>
  );
}

function SettingsCard({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          disabled && "cursor-not-allowed bg-muted/50 text-muted-foreground",
        )}
      />
    </label>
  );
}

function ReadonlyFact({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-black text-foreground">{value}</span>
        {badge ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  danger = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <button className="flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left transition hover:bg-accent/70">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-destructive/10 text-destructive" : "bg-accent text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-black", danger ? "text-destructive" : "text-foreground")}>
          {title}
        </span>
        <span className={cn("mt-1 block text-xs", danger ? "text-destructive" : "text-muted-foreground")}>
          {description}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-accent/70"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-foreground">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition",
          active ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-card shadow-sm transition",
            active && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

function PreferenceRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 border-b border-border py-4 text-left last:border-b-0">
      {Icon ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="size-4" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-sm font-black text-foreground">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-muted-foreground">{value}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
