import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  Clock3,
  Cloud,
  Compass,
  Eye,
  Globe2,
  KeyRound,
  Languages,
  Lock,
  Map,
  Moon,
  Palette,
  Radio,
  Route,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { changeDisplayName, changePassword } from "../lib/authApi";
import {
  fetchCurrentUser,
  fetchNotificationPreferences,
  updateNotificationPreference,
  type CurrentUser,
  type NotificationCategory,
  type NotificationPreferenceInput,
  type TimelineVisibility,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";
import { UserAvatar } from "./UserAvatar";

type SettingsSection =
  | "account"
  | "security"
  | "notifications"
  | "appearance"
  | "travel"
  | "privacy"
  | "about";

type ThemeChoice = "light" | "dark" | "system";

interface TravelPreferences {
  language: "vi";
  distanceUnit: "km" | "mi";
  timeFormat: "24h" | "12h";
  currency: "VND";
  defaultVisibility: TimelineVisibility;
}

const ACCOUNT_BIO_STORAGE_KEY = "vj:account-bio:v1";
const THEME_STORAGE_KEY = "vj:theme:v1";
const TRAVEL_PREFERENCES_STORAGE_KEY = "vj:travel-preferences:v1";
const defaultBio =
  "Lưu lại địa điểm hay, biến chúng thành lịch trình rõ ràng, rồi rủ bạn bè cùng chốt từng chặng đi khắp Việt Nam.";

const defaultTravelPreferences: TravelPreferences = {
  language: "vi",
  distanceUnit: "km",
  timeFormat: "24h",
  currency: "VND",
  defaultVisibility: "SHARED",
};

const settingsNav: Array<{
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "account", label: "Tài khoản", icon: UserRound },
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "appearance", label: "Giao diện", icon: Palette },
  { id: "travel", label: "Du lịch", icon: Route },
  { id: "privacy", label: "Riêng tư", icon: Lock },
  { id: "about", label: "Về VietJourney", icon: Cloud },
];

const themeOptions = [
  { value: "light" as const, label: "Sáng", icon: Sun },
  { value: "dark" as const, label: "Tối", icon: Moon },
  { value: "system" as const, label: "Theo hệ thống", icon: Smartphone },
];

const notificationGroups: Array<{
  category: NotificationCategory;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    category: "TIMELINE",
    title: "Timeline",
    description: "Nhắc về thay đổi lịch trình, hoạt động mới và cập nhật chuyến đi.",
    icon: CalendarDays,
  },
  {
    category: "COLLABORATION",
    title: "Cộng tác",
    description: "Lời mời, thành viên mới và chỉnh sửa từ người cùng chuyến.",
    icon: Users,
  },
  {
    category: "RECOMMENDATION",
    title: "Gợi ý địa điểm",
    description: "Đề xuất ăn uống, cafe và hoạt động phù hợp với kế hoạch của bạn.",
    icon: Compass,
  },
  {
    category: "SYSTEM",
    title: "Hệ thống",
    description: "Thông báo quan trọng về tài khoản và trạng thái ứng dụng.",
    icon: ShieldCheck,
  },
];

const profileChecklist = [
  "Tên hiển thị xuất hiện trong hồ sơ, lời mời chuyến đi và hoạt động cộng đồng.",
  "Tên người dùng hiện dùng để nhận diện tài khoản và chưa thể đổi từ giao diện này.",
  "Phần giới thiệu được lưu trên thiết bị để tránh tạo dữ liệu giả khi backend chưa hỗ trợ bio.",
];

const passwordGuidelines = [
  "Dùng mật khẩu riêng cho VietJourney, không dùng lại mật khẩu email hoặc mạng xã hội.",
  "Ưu tiên cụm từ dài, có chữ và số; thêm ký tự đặc biệt nếu bạn chia sẻ máy với người khác.",
  "Sau khi đổi mật khẩu, hãy đăng nhập lại trên thiết bị khác nếu bạn từng dùng tài khoản ở nơi công cộng.",
];

const notificationNotes = [
  "Trong ứng dụng: hiện trong trang Thông báo và các badge khi bạn đang dùng VietJourney.",
  "Realtime: cập nhật ngay khi backend gửi sự kiện mới cho timeline, cộng tác hoặc hệ thống.",
  "Email và push chưa hiển thị ở đây vì backend hiện chưa có tuỳ chọn tương ứng.",
];

const themeDetails = [
  "Sáng phù hợp khi lập kế hoạch ban ngày hoặc dùng ngoài trời.",
  "Tối giảm chói khi chỉnh timeline buổi tối.",
  "Theo hệ thống sẽ tự đổi theo chế độ của thiết bị.",
];

const travelUseCases = [
  "Timetable dùng định dạng giờ bạn chọn để đọc các khung ăn uống, di chuyển và check-in.",
  "Đơn vị khoảng cách áp dụng cho bản đồ, tuyến đường và mô tả di chuyển.",
  "VND được giữ cố định vì dữ liệu giá và ngân sách hiện tập trung cho chuyến đi tại Việt Nam.",
];

const privacyNotes = [
  "Riêng tư: chỉ bạn xem timeline cho đến khi chủ động mời người khác.",
  "Nhóm: phù hợp với chuyến đi có bạn bè hoặc gia đình cùng chỉnh lịch trình.",
  "Công khai: dùng khi bạn muốn chia sẻ lịch trình như một gợi ý cho cộng đồng.",
];

function getInitialTheme(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "dark" || storedTheme === "system" || storedTheme === "light"
    ? storedTheme
    : "light";
}

function getInitialTravelPreferences(): TravelPreferences {
  if (typeof window === "undefined") return defaultTravelPreferences;

  try {
    const raw = window.localStorage.getItem(TRAVEL_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultTravelPreferences;
    const parsed = JSON.parse(raw) as Partial<TravelPreferences>;
    return {
      language: "vi",
      distanceUnit: parsed.distanceUnit === "mi" ? "mi" : "km",
      timeFormat: parsed.timeFormat === "12h" ? "12h" : "24h",
      currency: "VND",
      defaultVisibility:
        parsed.defaultVisibility === "PRIVATE" || parsed.defaultVisibility === "PUBLIC_READ"
          ? parsed.defaultVisibility
          : "SHARED",
    };
  } catch {
    return defaultTravelPreferences;
  }
}

function defaultNotificationPreferenceMap(): Record<NotificationCategory, NotificationPreferenceInput> {
  return notificationGroups.reduce(
    (preferences, group) => ({
      ...preferences,
      [group.category]: { inAppEnabled: true, realtimeEnabled: true },
    }),
    {} as Record<NotificationCategory, NotificationPreferenceInput>,
  );
}

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
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>(getInitialTheme);
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences>(
    getInitialTravelPreferences,
  );
  const [notificationPreferences, setNotificationPreferences] = useState(
    defaultNotificationPreferenceMap,
  );
  const [notificationStatus, setNotificationStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [savingNotificationKey, setSavingNotificationKey] = useState<string | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
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

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingNotifications(true);

    fetchNotificationPreferences(controller.signal)
      .then((preferences) => {
        setNotificationPreferences((current) => {
          const next = { ...current };
          for (const preference of preferences) {
            next[preference.category] = {
              inAppEnabled: Boolean(preference.inAppEnabled),
              realtimeEnabled: Boolean(preference.realtimeEnabled),
            };
          }
          return next;
        });
        setNotificationStatus(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setNotificationStatus({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Không tải được tuỳ chọn thông báo lúc này.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingNotifications(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const useDarkTheme =
        selectedTheme === "dark" || (selectedTheme === "system" && systemQuery.matches);
      root.dataset.theme = useDarkTheme ? "dark" : "light";
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    applyTheme();

    if (selectedTheme !== "system") return;

    systemQuery.addEventListener("change", applyTheme);
    return () => systemQuery.removeEventListener("change", applyTheme);
  }, [selectedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TRAVEL_PREFERENCES_STORAGE_KEY, JSON.stringify(travelPreferences));
  }, [travelPreferences]);

  const activeMeta = useMemo(
    () => settingsNav.find((section) => section.id === activeSection) || settingsNav[0],
    [activeSection],
  );
  const ActiveIcon = activeMeta.icon;
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
  const enabledRealtimeCount = notificationGroups.filter(
    (group) => notificationPreferences[group.category]?.realtimeEnabled,
  ).length;
  const currentThemeLabel =
    themeOptions.find((option) => option.value === selectedTheme)?.label || "Sáng";

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
      setAccountForm({
        displayName: nextUser.displayName || nextUser.username || nextDisplayName,
        bio: nextBio,
      });
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
      bio:
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACCOUNT_BIO_STORAGE_KEY) || defaultBio
          : defaultBio,
    });
  }

  function updateTravelPreference<Key extends keyof TravelPreferences>(
    key: Key,
    value: TravelPreferences[Key],
  ) {
    setTravelPreferences((current) => ({ ...current, [key]: value }));
  }

  async function toggleNotificationPreference(
    category: NotificationCategory,
    key: keyof NotificationPreferenceInput,
  ) {
    const currentPreference =
      notificationPreferences[category] || defaultNotificationPreferenceMap()[category];
    const nextPreference = {
      ...currentPreference,
      [key]: !currentPreference[key],
    };
    const savingKey = `${category}:${key}`;

    setSavingNotificationKey(savingKey);
    setNotificationStatus(null);
    setNotificationPreferences((current) => ({ ...current, [category]: nextPreference }));

    try {
      const savedPreference = await updateNotificationPreference(category, nextPreference);
      setNotificationPreferences((current) => ({
        ...current,
        [category]: {
          inAppEnabled: Boolean(savedPreference.inAppEnabled),
          realtimeEnabled: Boolean(savedPreference.realtimeEnabled),
        },
      }));
      setNotificationStatus({
        type: "success",
        message: "Đã lưu tuỳ chọn thông báo.",
      });
    } catch (error) {
      setNotificationPreferences((current) => ({ ...current, [category]: currentPreference }));
      setNotificationStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Không lưu được tuỳ chọn thông báo lúc này.",
      });
    } finally {
      setSavingNotificationKey(null);
    }
  }

  function renderSectionContent() {
    switch (activeSection) {
      case "account":
        return (
          <SectionPanel title="Tài khoản" description="Thông tin hiển thị của bạn trong VietJourney.">
            <form
              onSubmit={handleSaveAccount}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Thông tin tài khoản</h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Cập nhật cách bạn xuất hiện trong hồ sơ, chuyến đi chung và hoạt động cộng đồng.
                  </p>
                </div>
                {isEditingAccount ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={cancelAccountEdit}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAccount}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAccount ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountStatus(null);
                      setIsEditingAccount(true);
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-5 border-b border-border px-5 py-6 md:flex-row md:items-center">
                <UserAvatar
                  name={displayName}
                  seed={user?.id || user?.username}
                  className="size-24"
                  initialsClassName="text-3xl"
                  badgeClassName="size-8"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-black tracking-tight text-foreground">{displayName}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-primary">{username}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {accountForm.bio}
                  </p>
                </div>
              </div>

              <div className="px-5 py-5">
                <h4 className="text-sm font-bold text-foreground">Thông tin cá nhân</h4>
                <div className="mt-4 divide-y divide-border border-y border-border">
                  <AccountInfoRow label="Họ và tên">
                    {isEditingAccount ? (
                      <input
                        value={accountForm.displayName}
                        disabled={isLoadingUser}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            displayName: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/50"
                      />
                    ) : (
                      <span>{isLoadingUser ? "Đang tải..." : displayName}</span>
                    )}
                  </AccountInfoRow>
                  <AccountInfoRow label="Tên người dùng">
                    <span>{username}</span>
                  </AccountInfoRow>
                  <AccountInfoRow label="Ảnh đại diện">
                    <span>Được tạo tự động từ tên tài khoản</span>
                  </AccountInfoRow>
                  <AccountInfoRow label="Giới thiệu bản thân" alignTop>
                    {isEditingAccount ? (
                      <div className="w-full">
                        <textarea
                          value={accountForm.bio}
                          onChange={(event) =>
                            setAccountForm((current) => ({ ...current, bio: event.target.value }))
                          }
                          maxLength={180}
                          className="min-h-24 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                          {accountForm.bio.length}/180 ký tự
                        </span>
                      </div>
                    ) : (
                      <span className="leading-6">{accountForm.bio}</span>
                    )}
                  </AccountInfoRow>
                  <AccountInfoRow label="Trạng thái tài khoản">
                    <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                      Hoạt động
                    </span>
                  </AccountInfoRow>
                </div>

                <div className="border-b border-border py-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {profileChecklist.map((item) => (
                      <div key={item} className="rounded-lg bg-muted/45 p-3 text-xs font-semibold leading-5 text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {accountStatus ? (
                  <div className="mt-4">
                    <InlineStatus status={accountStatus.type} message={accountStatus.message} />
                  </div>
                ) : null}

                <p className="pt-4 text-sm leading-6 text-muted-foreground">
                  Cập nhật thông tin cá nhân và quản lý cách tài khoản của bạn xuất hiện trong VietJourney.
                  Ảnh upload và đồng bộ bio đa thiết bị sẽ được thêm khi backend hỗ trợ.
                </p>
              </div>
            </form>
          </SectionPanel>
        );

      case "security":
        return (
          <SectionPanel
            title="Bảo mật"
            description="Đổi mật khẩu và giữ quyền truy cập tài khoản ở trạng thái an toàn."
          >
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <KeyRound className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Mật khẩu VietJourney</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Mật khẩu bảo vệ timeline, danh sách đã lưu và lời mời tham gia chuyến đi.
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

              <div className="grid gap-4 md:grid-cols-2">
                <InfoList title="Gợi ý bảo vệ tài khoản" items={passwordGuidelines} />
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Phạm vi hiện tại</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        VietJourney hiện hỗ trợ đổi mật khẩu bằng API có sẵn. Các mục như xác thực hai lớp,
                        lịch sử phiên đăng nhập và đăng xuất khỏi mọi thiết bị chưa được thêm để tránh tạo
                        điều khiển không hoạt động.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {passwordStatus ? (
                <InlineStatus status={passwordStatus.type} message={passwordStatus.message} />
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordStatus(null);
                  }}
                  className="rounded-lg border border-border px-5 py-3 text-sm font-bold text-foreground transition hover:bg-accent"
                >
                  Xóa nhập liệu
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isChangingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </SectionPanel>
        );

      case "notifications":
        return (
          <SectionPanel
            title="Thông báo"
            description="Điều chỉnh thông báo trong ứng dụng và cập nhật thời gian thực theo từng nhóm."
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                {enabledRealtimeCount}/{notificationGroups.length} nhóm đang bật realtime
              </span>
              {isLoadingNotifications ? (
                <span className="text-sm font-semibold text-muted-foreground">Đang tải...</span>
              ) : null}
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-background">
              {notificationGroups.map(({ category, title, description, icon: Icon }) => {
                const preference = notificationPreferences[category];
                const savingInApp = savingNotificationKey === `${category}:inAppEnabled`;
                const savingRealtime = savingNotificationKey === `${category}:realtimeEnabled`;

                return (
                  <div key={category} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TogglePill
                        label="Trong ứng dụng"
                        active={preference.inAppEnabled}
                        disabled={Boolean(savingNotificationKey)}
                        saving={savingInApp}
                        onClick={() => void toggleNotificationPreference(category, "inAppEnabled")}
                      />
                      <TogglePill
                        label="Realtime"
                        active={preference.realtimeEnabled}
                        disabled={Boolean(savingNotificationKey)}
                        saving={savingRealtime}
                        onClick={() => void toggleNotificationPreference(category, "realtimeEnabled")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <InfoList title="Cách VietJourney gửi thông báo" items={notificationNotes} />
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-bold text-foreground">Nhóm ưu tiên</p>
                <div className="mt-4 space-y-3 text-sm">
                  {notificationGroups.map(({ category, title }) => {
                    const preference = notificationPreferences[category];
                    const enabledCount =
                      Number(preference.inAppEnabled) + Number(preference.realtimeEnabled);

                    return (
                      <div key={category} className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-muted-foreground">{title}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
                          {enabledCount}/2 bật
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {notificationStatus ? (
              <div className="mt-4">
                <InlineStatus status={notificationStatus.type} message={notificationStatus.message} />
              </div>
            ) : null}
          </SectionPanel>
        );

      case "appearance":
        return (
          <SectionPanel title="Giao diện" description="Đồng bộ cách hiển thị với môi trường bạn đang dùng.">
            <div className="grid gap-3 md:grid-cols-3">
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const active = selectedTheme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedTheme(value)}
                    className={cn(
                      "flex min-h-28 flex-col justify-between rounded-lg border p-4 text-left transition",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-background hover:border-primary/30 hover:bg-accent/45",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="size-5 text-primary" />
                      <CheckMark active={active} />
                    </div>
                    <span className="mt-5 text-sm font-bold text-foreground">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Chế độ hiện tại: <span className="font-bold text-foreground">{currentThemeLabel}</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoList title="Khi nào nên dùng từng chế độ?" items={themeDetails} />
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Palette className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Màu chủ đạo</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      VietJourney đang giữ màu xanh làm nhận diện chính để đồng bộ với bản đồ, timetable
                      và các hành động lập kế hoạch. Tuỳ biến màu riêng sẽ phù hợp hơn khi có hệ thống theme hoàn chỉnh.
                    </p>
                    <div className="mt-4 flex gap-2">
                      {["bg-primary", "bg-sky-500", "bg-cyan-500", "bg-slate-400"].map((color) => (
                        <span key={color} className={cn("size-7 rounded-full ring-2 ring-card", color)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoList title="Cách hiểu quyền hiển thị" items={privacyNotes} />
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <Lock className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Dữ liệu và kiểm soát</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Xuất dữ liệu, xoá tài khoản và quản lý phiên đăng nhập chưa có API trong lần này,
                        nên VietJourney chỉ hiển thị các thiết lập đang có tác dụng thật. Khi backend hỗ trợ,
                        các hành động dữ liệu nên nằm ở đây thay vì trong Account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>
        );

      case "travel":
        return (
          <SectionPanel
            title="Tuỳ chọn du lịch"
            description="Các định dạng mặc định cho bản đồ, timeline và chi phí chuyến đi."
          >
            <div className="divide-y divide-border rounded-lg border border-border bg-background">
              <PreferenceRow icon={Languages} title="Ngôn ngữ" description="Giao diện VietJourney">
                <StaticValue value="Tiếng Việt" />
              </PreferenceRow>
              <PreferenceRow icon={Wallet} title="Tiền tệ" description="Dùng cho dự toán và chia chi phí">
                <StaticValue value="VND" />
              </PreferenceRow>
              <PreferenceRow icon={Map} title="Đơn vị khoảng cách" description="Hiển thị trong bản đồ và tuyến đường">
                <SegmentedControl
                  value={travelPreferences.distanceUnit}
                  options={[
                    { value: "km", label: "Kilometer" },
                    { value: "mi", label: "Mile" },
                  ]}
                  onChange={(distanceUnit) => updateTravelPreference("distanceUnit", distanceUnit)}
                />
              </PreferenceRow>
              <PreferenceRow icon={Clock3} title="Định dạng thời gian" description="Hiển thị trong timetable">
                <SegmentedControl
                  value={travelPreferences.timeFormat}
                  options={[
                    { value: "24h", label: "24 giờ" },
                    { value: "12h", label: "12 giờ" },
                  ]}
                  onChange={(timeFormat) => updateTravelPreference("timeFormat", timeFormat)}
                />
              </PreferenceRow>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
              <InfoList title="Những tuỳ chọn này ảnh hưởng gì?" items={travelUseCases} />
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Map className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Mặc định cho chuyến đi mới</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Các lựa chọn này được lưu cục bộ và sẽ là nền cho trải nghiệm lập timeline,
                      xem tuyến đường và đọc chi phí trước khi có API đồng bộ thiết bị.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>
        );

      case "privacy":
        return (
          <SectionPanel
            title="Riêng tư & chia sẻ"
            description="Đặt cách timeline mới được chia sẻ và cách VietJourney cá nhân hoá trải nghiệm."
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Eye className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Quyền riêng tư mặc định của timeline mới</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Tuỳ chọn này được lưu trên thiết bị để dùng làm mặc định khi tạo chuyến đi mới.
                    </p>
                    <div className="mt-4">
                      <SegmentedControl
                        value={travelPreferences.defaultVisibility}
                        options={[
                          { value: "PRIVATE", label: "Riêng tư" },
                          { value: "SHARED", label: "Nhóm" },
                          { value: "PUBLIC_READ", label: "Công khai" },
                        ]}
                        onChange={(defaultVisibility) =>
                          updateTravelPreference("defaultVisibility", defaultVisibility)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Radio className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Cộng đồng và gợi ý</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Bài chia sẻ cộng đồng chỉ được tạo khi bạn chọn chia sẻ một timeline. Gợi ý địa điểm dùng lịch sử lưu và tương tác trong ứng dụng.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>
        );

      case "about":
        return (
          <SectionPanel
            title="Về VietJourney"
            description="Một nơi để khám phá địa điểm, lập timeline và phối hợp chuyến đi tại Việt Nam."
          >
            <div className="space-y-5 text-sm leading-7 text-muted-foreground">
              <p>
                VietJourney là nền tảng lập kế hoạch du lịch tại Việt Nam, tập trung vào khám phá địa điểm, gợi ý cá nhân hoá, timeline nhiều ngày và cộng tác theo thời gian thực.
              </p>
              <p>
                Ứng dụng xoay quanh dữ liệu du lịch Việt Nam như quận huyện, tag, bản đồ, lịch trình nhóm và ngân sách để việc chuẩn bị chuyến đi rõ ràng hơn.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <FeatureRow icon={Compass} title="Khám phá" description="Lọc địa điểm ăn uống, cafe và hoạt động theo khu vực, giá, rating và tag." />
              <FeatureRow icon={Route} title="Timeline" description="Kéo thả địa điểm vào lịch trình nhiều ngày và xem tuyến đường trên bản đồ." />
              <FeatureRow icon={Users} title="Cộng tác" description="Mời thành viên, theo dõi thay đổi và phối hợp trên cùng một chuyến đi." />
              <FeatureRow icon={Wallet} title="Ngân sách" description="Theo dõi chi phí và chuẩn bị cho việc chia khoản chi trong nhóm." />
            </div>
          </SectionPanel>
        );

      default:
        return null;
    }
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-6">
        <header className="border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            VietJourney
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-foreground">Cài đặt</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Quản lý tài khoản, thông báo và các tuỳ chọn mặc định cho chuyến đi.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ActiveIcon className="size-4 text-primary" />
              {activeMeta.label}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <nav className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1.5 sm:grid-cols-3 xl:grid-cols-1">
              {settingsNav.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition",
                    activeSection === id
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">{renderSectionContent()}</section>
        </div>
      </div>
    </main>
  );
}

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-bold tracking-normal text-foreground">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InlineStatus({
  status,
  message,
}: {
  status: "success" | "error" | "info";
  message: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm font-semibold",
        status === "success" && "border-primary/25 bg-primary/10 text-primary",
        status === "info" && "border-border bg-accent text-primary",
        status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {message}
    </div>
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
          "mt-2 h-11 w-full rounded-lg border border-border bg-background px-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          disabled && "cursor-not-allowed bg-muted/50 text-muted-foreground",
        )}
      />
    </label>
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
        className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full border transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

function TogglePill({
  label,
  active,
  saving,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  saving?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition disabled:cursor-wait disabled:opacity-70",
        active
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          active ? "bg-primary" : "bg-muted-foreground/45",
          saving && "animate-pulse",
        )}
      />
      {label}
    </button>
  );
}

function StaticValue({ value }: { value: string }) {
  return (
    <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground">
      {value}
    </span>
  );
}

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SegmentedControl<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: Array<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-8 rounded-md px-3 text-sm font-bold transition",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountInfoRow({
  label,
  alignTop,
  children,
}: {
  label: string;
  alignTop?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 py-4 text-sm md:grid-cols-[180px_minmax(0,1fr)]",
        alignTop ? "md:items-start" : "md:items-center",
      )}
    >
      <span className="font-semibold text-muted-foreground">{label}</span>
      <div className="min-w-0 font-semibold text-foreground">{children}</div>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-1 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/55 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-foreground">{value}</p>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-background p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
