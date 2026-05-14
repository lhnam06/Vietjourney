import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, KeyRound, RefreshCw, Users, PlusCircle, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { ApiError } from '../lib/api';
import { toast } from 'sonner';
import { deleteTimelineItem, loadTripData, setLastTripId, upsertTimelineItem } from '../lib/tripStorage';
import {
  getMyTimelines,
  joinTimelineByCode,
  resetTimelineInviteCode,
  createTimeline,
  type ApiTimelineDetail,
  type ApiResetInviteCodeResponse,
} from '../lib/timelineApi';

type InviteRole = 'EDITOR' | 'VIEWER';

function resolveMyRole(timeline: ApiTimelineDetail, username: string): string {
  if (timeline.ownerUsername === username) return 'OWNER';
  const mine = (timeline.members ?? []).find((member) => member.username === username);
  return mine?.role ?? 'VIEWER';
}

export default function Timelines() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [timelines, setTimelines] = useState<ApiTimelineDetail[]>([]);
  const [timelinesLoading, setTimelinesLoading] = useState(false);
  const [timelinesError, setTimelinesError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [selectedTimelineId, setSelectedTimelineId] = useState('');
  const [role, setRole] = useState<InviteRole>('EDITOR');
  const [maxUses, setMaxUses] = useState('20');
  const [expiresInHours, setExpiresInHours] = useState('72');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<ApiResetInviteCodeResponse | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newVisibility, setNewVisibility] = useState<'PRIVATE' | 'SHARED' | 'PUBLIC_READ'>('PRIVATE');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setTimelines([]);
      setTimelinesLoading(false);
      setTimelinesError(null);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setTimelines([]);
      return;
    }

    let cancelled = false;
    setTimelinesLoading(true);
    setTimelinesError(null);

    void (async () => {
      try {
        const rows = await getMyTimelines(token);
        if (!cancelled) {
          setTimelines(rows ?? []);
          // Auto-select first owned timeline if none selected
          const owned = (rows ?? []).filter(t => t.ownerUsername === user?.username);
          if (owned.length > 0 && !selectedTimelineId) {
            setSelectedTimelineId(owned[0].id);
            setLastTripId(owned[0].id); // Update lastTripId for navigation
          }
        }
      } catch (e) {
        if (!cancelled) {
          setTimelines([]);
          setTimelinesError(
            e instanceof ApiError ? e.message : 'Khong tai duoc danh sach timeline.'
          );
        }
      } finally {
        if (!cancelled) setTimelinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, reloadKey]);

  const ownerTimelines = useMemo(() => {
    const username = user?.username;
    if (!username) return [];
    return timelines.filter((timeline) => timeline.ownerUsername === username);
  }, [timelines, user?.username]);

  useEffect(() => {
    if (!ownerTimelines.length) {
      setSelectedTimelineId('');
      return;
    }
    if (!ownerTimelines.some((timeline) => timeline.id === selectedTimelineId)) {
      setSelectedTimelineId(ownerTimelines[0]!.id);
    }
  }, [ownerTimelines, selectedTimelineId]);

  const handleJoinByCode = async () => {
    const token = getStoredToken();
    if (!token) return;
    if (!joinCode.trim()) {
      setJoinError('Vui long nhap code.');
      return;
    }
    setJoinLoading(true);
    setJoinError(null);
    try {
      const result = await joinTimelineByCode(joinCode.trim(), token);
      setJoinCode('');
      setReloadKey((n) => n + 1);
      setLastTripId(result.timelineId); // Update lastTripId for navigation
      navigate(`/timetable/${result.timelineId}`);
    } catch (e) {
      setJoinError(e instanceof ApiError ? e.message : 'Khong the tham gia timeline.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleResetCode = async () => {
    const token = getStoredToken();
    if (!token || !selectedTimelineId) return;

    const maxUsesNum = Number(maxUses);
    const expiresHoursNum = Number(expiresInHours);
    setResetLoading(true);
    setResetError(null);
    setInviteResult(null);

    try {
      const result = await resetTimelineInviteCode(
        selectedTimelineId,
        {
          role,
          ...(Number.isFinite(maxUsesNum) && maxUsesNum > 0 ? { maxUses: maxUsesNum } : {}),
          ...(Number.isFinite(expiresHoursNum) && expiresHoursNum > 0
            ? { expiresInHours: expiresHoursNum }
            : {}),
        },
        token
      );
      setInviteResult(result);
    } catch (e) {
      setResetError(e instanceof ApiError ? e.message : 'Khong the reset invite code.');
    } finally {
      setResetLoading(false);
    }
  };

  const copyInviteCode = async (codeValue?: string) => {
    const codeToCopy = codeValue || inviteResult?.code;
    if (!codeToCopy || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      toast.success('Đã sao chép mã mời!');
    } catch {
      /* ignore copy errors */
    }
  };

  const handleCreateTimeline = async () => {
    const token = getStoredToken();
    if (!token) return;
    if (!newTitle.trim() || !newStartDate || !newEndDate) {
      setCreateError('Vui lòng nhập đầy đủ tiêu đề và ngày bắt đầu/kết thúc.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const createdTimeline = await createTimeline(
        {
          title: newTitle,
          description: newDescription,
          startDate: newStartDate,
          endDate: newEndDate,
          visibility: newVisibility,
        },
        token
      );
      
      setLastTripId(createdTimeline.id); // Update lastTripId for navigation

      // Automatically generate an invite code for the new timeline
      try {
        const inviteCode = await resetTimelineInviteCode(
          createdTimeline.id,
          { role: 'EDITOR', expiresInHours: 72 },
          token
        );
        setInviteResult(inviteCode);
        setSelectedTimelineId(createdTimeline.id);
      } catch (err) {
        console.error('Failed to auto-generate invite code:', err);
      }

      setNewTitle('');
      setNewDescription('');
      setNewStartDate('');
      setNewEndDate('');
      setReloadKey((n) => n + 1);
      toast.success('Đã tạo timeline thành công!');
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : 'Không thể tạo timeline.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="h-full bg-slate-50 p-6">
        <Card className="max-w-xl mx-auto p-6">
          <h1 className="text-xl font-bold text-[#0A4A6E]">Timeline</h1>
          <p className="mt-2 text-sm text-slate-600">
            Dang nhap de reset invite code va tham gia timeline bang code.
          </p>
          <Button asChild className="mt-4 bg-[#0A4A6E] hover:bg-[#0d5d8a]">
            <Link to={`/auth?next=${encodeURIComponent('/timelines')}`}>Den dang nhap</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-5 h-5 text-[#FF6B35]" />
            <h1 className="text-xl font-bold text-[#0A4A6E]">Tham gia timeline bằng code</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Nhập invite code"
              className="sm:flex-1"
            />
            <Button
              type="button"
              className="bg-[#0A4A6E] hover:bg-[#0d5d8a]"
              onClick={handleJoinByCode}
              disabled={joinLoading || authLoading}
            >
              {joinLoading ? 'Đang tham gia...' : 'Tham gia'}
            </Button>
          </div>
          {joinError ? <p className="mt-2 text-sm text-red-600">{joinError}</p> : null}
        </Card>

        <Card className="p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-[#0b5d55]" />
            <h2 className="text-xl font-bold text-[#0A4A6E]">Tạo Timeline Mới</h2>
          </div>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tiêu đề chuyến đi (ví dụ: Hà Nội 3 ngày 2 đêm)"
            />
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Mô tả ngắn"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ngày kết thúc</label>
                <Input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
            </div>
            <select
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as any)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="PRIVATE">Chỉ mình tôi (PRIVATE)</option>
              <option value="SHARED">Chia sẻ qua link (SHARED)</option>
              <option value="PUBLIC_READ">Công khai (PUBLIC_READ)</option>
            </select>
            <Button
              type="button"
              onClick={handleCreateTimeline}
              disabled={createLoading}
              className="w-full bg-[#0b5d55] hover:bg-[#094d46]"
            >
              {createLoading ? 'Đang tạo...' : 'Tạo Timeline'}
            </Button>
            {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          </div>
        </Card>

        <Card className="p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0A4A6E]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">Reset invite code (owner)</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((n) => n + 1)}
              className="border-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Tai lai
            </Button>
          </div>

          {timelinesError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertTitle>Khong tai duoc timeline</AlertTitle>
              <AlertDescription>{timelinesError}</AlertDescription>
            </Alert>
          ) : null}

          {!timelinesLoading && ownerTimelines.length === 0 ? (
            <p className="text-sm text-slate-600">
              Ban chua co timeline nao voi vai tro owner de reset code.
            </p>
          ) : null}

          {ownerTimelines.length > 0 ? (
            <div className="space-y-3">
              <select
                value={selectedTimelineId}
                onChange={(e) => setSelectedTimelineId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {ownerTimelines.map((timeline) => (
                  <option key={timeline.id} value={timeline.id}>
                    {timeline.title}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as InviteRole)}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="EDITOR">EDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
                <Input
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Max uses"
                  inputMode="numeric"
                />
                <Input
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  placeholder="Expires (hours)"
                  inputMode="numeric"
                />
              </div>

              <Button
                type="button"
                onClick={handleResetCode}
                disabled={resetLoading || !selectedTimelineId}
                className="bg-[#FF6B35] hover:bg-[#ff7d4d]"
              >
                {resetLoading ? 'Dang reset...' : 'Reset code'}
              </Button>
              {resetError ? <p className="text-sm text-red-600">{resetError}</p> : null}

              {inviteResult || (selectedTimelineId && ownerTimelines.find(t => t.id === selectedTimelineId)?.activeInviteCode) ? (
                (() => {
                  const activeTimeline = ownerTimelines.find(t => t.id === selectedTimelineId);
                  const displayCode = inviteResult?.code || activeTimeline?.activeInviteCode;
                  const displayRole = inviteResult?.role || 'OWNER/MEMBER';
                  const displayExpires = inviteResult?.expiresAt;

                  return (
                    <div className="relative overflow-hidden rounded-2xl border-2 border-[#FF6B35]/30 bg-gradient-to-br from-[#FFF5F0] to-[#FFE4D6] p-6 shadow-xl animate-in fade-in zoom-in duration-300">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <KeyRound className="w-16 h-16 text-[#FF6B35]" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35] text-white">
                            <PlusCircle className="h-5 w-5" />
                          </div>
                          <h3 className="text-sm font-bold text-[#8B3D1F] uppercase tracking-wider">Mã mời của bạn</h3>
                        </div>

                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between gap-4 rounded-xl bg-white/80 backdrop-blur-sm border border-white p-4 shadow-inner">
                            <code className="text-3xl font-black tracking-[0.2em] text-[#0A4A6E] font-mono">
                              {displayCode}
                            </code>
                            <Button 
                              type="button" 
                              size="lg" 
                              className="bg-[#0A4A6E] hover:bg-[#0d5d8a] text-white font-bold px-6 shadow-md transition-all hover:scale-105"
                              onClick={() => copyInviteCode(displayCode)}
                            >
                              COPY
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-slate-600">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 border border-white/50">
                              <Users className="w-3.5 h-3.5 text-[#FF6B35]" />
                              <span>Vai trò: <span className="text-[#0A4A6E] font-bold">{displayRole}</span></span>
                            </div>
                            {displayExpires && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/40 border border-white/50">
                                <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                                <span>Hết hạn: <span className="text-[#0A4A6E] font-bold">{new Date(displayExpires).toLocaleDateString('vi-VN')}</span></span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-center text-slate-500 italic">
                            * Chia sẻ mã này với bạn bè để họ có thể tham gia vào timeline của bạn.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="p-6 shadow-lg">
          <h2 className="text-xl font-bold text-[#0A4A6E] mb-4">Timeline cua toi</h2>
          {timelinesLoading ? <p className="text-sm text-slate-600">Dang tai timeline...</p> : null}
          {!timelinesLoading && timelines.length === 0 ? (
            <p className="text-sm text-slate-600">Chua co timeline nao.</p>
          ) : null}
          <div className="space-y-3">
            {timelines.map((timeline) => {
              const myRole = resolveMyRole(timeline, user?.username ?? '');
              return (
                <div key={timeline.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#0A4A6E]">{timeline.title}</p>
                      <p className="text-xs text-slate-600">
                        {timeline.startDate} {"->"} {timeline.endDate} · role: {myRole}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/timetable/${timeline.id}`}>Mo timetable</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
