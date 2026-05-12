import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, KeyRound, RefreshCw, Users } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { ApiError } from '../lib/api';
import {
  getMyTimelines,
  joinTimelineByCode,
  resetTimelineInviteCode,
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
        if (!cancelled) setTimelines(rows ?? []);
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

  const copyInviteCode = async () => {
    if (!inviteResult?.code || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(inviteResult.code);
    } catch {
      /* ignore copy errors */
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
            <h1 className="text-xl font-bold text-[#0A4A6E]">Tham gia timeline bang code</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Nhap invite code"
              className="sm:flex-1"
            />
            <Button
              type="button"
              className="bg-[#0A4A6E] hover:bg-[#0d5d8a]"
              onClick={handleJoinByCode}
              disabled={joinLoading || authLoading}
            >
              {joinLoading ? 'Dang tham gia...' : 'Tham gia'}
            </Button>
          </div>
          {joinError ? <p className="mt-2 text-sm text-red-600">{joinError}</p> : null}
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

              {inviteResult ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs text-slate-600">Code moi (chi hien thi 1 lan):</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-lg font-bold tracking-wider text-[#0A4A6E]">{inviteResult.code}</code>
                    <Button type="button" size="sm" variant="outline" onClick={copyInviteCode}>
                      Copy
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Role: {inviteResult.role} · Max uses: {inviteResult.maxUses} · Exp: {inviteResult.expiresAt}
                  </p>
                </div>
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
                        {timeline.startDate} -> {timeline.endDate} · role: {myRole}
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
