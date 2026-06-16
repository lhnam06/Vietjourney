import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2, Wand2, Clock, MapPin, DollarSign, CalendarDays } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useAuth } from '../context/AuthContext';
import {
  callHuggingFaceAgent,
  executeAgentPlan,
  type HfPlanResponse,
  type HfTimelineEvent,
  type ExecutionMode,
  type ExecutePlanResponse,
  type EventExecutionResult,
} from '../lib/agentApi';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PanelPhase =
  | 'idle'
  | 'planning'           // Waiting for HF agent
  | 'chat_response'      // HF agent wants more info
  | 'plan_display'       // HF agent returned a plan
  | 'hf_error'           // HF API error
  | 'executing'          // Backend is executing the plan
  | 'execution_result';  // Execution finished

type ExecutingEvent = {
  index: number;
  label: string;
  status: 'pending' | 'in_progress' | 'success' | 'error' | 'skipped';
  errorMessage?: string;
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timelineId: string;
  /** Start date of the trip (yyyy-MM-dd), passed from Planner. */
  startDate?: string;
  /** Callback after events are successfully added so Planner can refresh. */
  onTimelineUpdated?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const AgentPanel: React.FC<AgentPanelProps> = ({
  isOpen,
  onClose,
  timelineId,
  startDate: propStartDate,
  onTimelineUpdated,
}) => {
  const { user, token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---- State ---- */
  const [phase, setPhase] = useState<PanelPhase>('idle');
  const [userInput, setUserInput] = useState('');
  const [sessionId] = useState(() => `vj-${user?.id || 'anon'}-${Date.now()}`);

  // HF agent response data
  const [hfResponse, setHfResponse] = useState<HfPlanResponse | null>(null);

  // Execution state
  const [executingEvents, setExecutingEvents] = useState<ExecutingEvent[]>([]);
  const [executionSummary, setExecutionSummary] = useState<{
    total: number;
    success: number;
    skipped: number;
    errors: number;
  } | null>(null);

  // Date selection (defaults to trip start date or today)
  const [selectedDate, setSelectedDate] = useState<string>(
    propStartDate || new Date().toISOString().slice(0, 10)
  );

  // Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ---- Reset on open/close ---- */
  useEffect(() => {
    if (isOpen) {
      resetPanel();
    }
  }, [isOpen]);

  const resetPanel = useCallback(() => {
    setPhase('idle');
    setHfResponse(null);
    setExecutingEvents([]);
    setExecutionSummary(null);
    setErrorMessage(null);
    setUserInput('');
    setSelectedDate(propStartDate || new Date().toISOString().slice(0, 10));
  }, [propStartDate]);

  /* ---- Auto-scroll ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase, executingEvents, executionSummary]);

  /* ---- Helpers ---- */
  /** Trip's actual start date (from Planner) — sent to HF agent for context. */
  const tripStartDate = propStartDate || new Date().toISOString().slice(0, 10);

  /* ---- Phase A: Send to Hugging Face Agent ---- */
  const handlePlanRequest = async (message?: string) => {
    const input = message ?? userInput;
    if (!input.trim()) return;

    setPhase('planning');
    setErrorMessage(null);
    setHfResponse(null);

    const startDate = tripStartDate;

    if (!message) setUserInput('');
    // Clear and set the hint text in the input for visual feedback
    if (message) setUserInput(message);

    try {
      const response = await callHuggingFaceAgent(
        input,
        startDate,
        1, // numDays — HF agent returns time ranges regardless
        sessionId,
      );

      setHfResponse(response);

      if (response.status === 'chat') {
        setPhase('chat_response');
      } else if (response.status === 'success') {
        setPhase('plan_display');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối đến AI';
      setErrorMessage(msg);
      setPhase('hf_error');
      toast.error('Không thể kết nối đến AI Planner');
    }
  };

  /* ---- Phase C: Execute plan via backend ---- */
  const handleExecutePlan = async (mode: ExecutionMode) => {
    if (!hfResponse || hfResponse.status !== 'success' || !token) return;

    const events = hfResponse.timeline;

    // Initialize progress tracking
    const initialProgress: ExecutingEvent[] = events.map((ev, i) => ({
      index: i,
      label: `${ev.activity} tại ${ev.location}`,
      status: 'pending' as const,
    }));
    setExecutingEvents(initialProgress);
    setPhase('executing');

    try {
      const result = await executeAgentPlan(
        {
          timeline: events,
          timelineId,
          startDate: selectedDate,
          mode,
        },
        token,
      );

      // Map results to progress
      const mapped: ExecutingEvent[] = result.results.map((r) => ({
        index: r.index,
        label: r.label,
        status: mapResultStatus(r.status),
        errorMessage: r.errorMessage,
      }));
      setExecutingEvents(mapped);
      setExecutionSummary({
        total: result.totalEvents,
        success: result.successCount,
        skipped: result.skippedCount,
        errors: result.errorCount,
      });
      setPhase('execution_result');

      if (result.errorCount === 0 && result.skippedCount === 0) {
        toast.success(
          mode === 'DIRECT_ADD'
            ? 'Đã thêm tất cả sự kiện vào lịch trình!'
            : 'Đã đề xuất tất cả sự kiện cho nhóm!',
        );
      } else if (result.errorCount > 0) {
        toast.error(`Có ${result.errorCount} sự kiện không thể thêm.`);
      }

      // Notify parent to refresh
      onTimelineUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống';
      toast.error('Không thể thực thi kế hoạch: ' + msg);
      setErrorMessage(msg);
      setPhase('hf_error');
    }
  };

  /* ---- Render helpers ---- */

  const mapResultStatus = (s: string): ExecutingEvent['status'] => {
    switch (s) {
      case 'SUCCESS':
        return 'success';
      case 'SKIPPED':
        return 'skipped';
      case 'ERROR':
        return 'error';
      default:
        return 'pending';
    }
  };

  const getModeLabel = (mode: ExecutionMode): string => {
    return mode === 'DIRECT_ADD' ? 'Thêm vào lịch trình' : 'Đề xuất cho nhóm';
  };

  /* ================================================================ */
  /*  RENDER: Dialog Wrapper                                           */
  /* ================================================================ */

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-[90vw] max-w-[600px] overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex flex-col h-full max-h-[inherit] min-h-0" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <DialogHeader className="p-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--vj-primary)] to-[var(--vj-accent)] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">AI Planner</DialogTitle>
            {phase === 'planning' && (
              <Badge variant="outline" className="ml-2 text-[11px] animate-pulse bg-orange-50 text-orange-700 border-orange-200">
                Đang suy nghĩ...
              </Badge>
            )}
            {phase === 'executing' && (
              <Badge variant="outline" className="ml-2 text-[11px] animate-pulse bg-blue-50 text-blue-700 border-blue-200">
                Đang thực thi...
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {phase === 'idle' && 'Mô tả lịch trình bạn muốn, AI sẽ gợi ý các hoạt động.'}
            {phase === 'planning' && 'AI đang lên kế hoạch cho bạn...'}
            {phase === 'chat_response' && 'AI cần thêm thông tin.'}
            {phase === 'plan_display' && 'Xem và xác nhận kế hoạch AI đề xuất.'}
            {phase === 'executing' && 'Đang thêm sự kiện vào lịch trình...'}
            {phase === 'execution_result' && executionSummary && getExecutionSummaryText()}
          </p>
          {/* Date picker — always visible so user can choose which day events land on */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 mr-1">Thêm vào ngày:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-7 text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--vj-accent)] cursor-pointer"
            />
            {phase === 'idle' && (
              <span className="text-[10px] text-orange-500 ml-1 animate-pulse">Chọn ngày trước khi nhập ↓</span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="flex flex-col gap-4 min-h-[200px]">
            {renderPhaseContent()}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Footer: Input — always visible so user can type at any time */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePlanRequest();
          }}
          className="flex items-center gap-2 p-4 border-t border-slate-200 flex-shrink-0"
        >
          <Input
            placeholder={
              phase === 'chat_response'
                ? 'Trả lời AI để có kế hoạch chi tiết hơn...'
                : phase === 'plan_display'
                  ? 'Yêu cầu chỉnh sửa hoặc kế hoạch mới...'
                  : phase === 'execution_result'
                    ? 'Hỏi AI một kế hoạch khác...'
                    : 'VD: Lên kế hoạch một ngày ở Quận 1...'
            }
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1"
            autoFocus={phase === 'idle' || phase === 'plan_display' || phase === 'execution_result'}
            disabled={phase === 'planning' || phase === 'executing'}
          />
          <Button
            type="submit"
            size="icon"
            disabled={userInput.trim() === '' || phase === 'planning' || phase === 'executing'}
          >
            {phase === 'planning' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );

  /* ================================================================ */
  /*  Phase content renderers                                          */
  /* ================================================================ */

  function renderPhaseContent() {
    switch (phase) {
      case 'idle':
        return renderIdle();
      case 'planning':
        return renderPlanning();
      case 'chat_response':
        return renderChatResponse();
      case 'plan_display':
        return renderPlanDisplay();
      case 'hf_error':
        return renderError();
      case 'executing':
        return renderExecuting();
      case 'execution_result':
        return renderExecutionResult();
      default:
        return null;
    }
  }

  /* ---- Idle ---- */
  function renderIdle() {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 mb-4 shadow-sm border border-orange-200/50">
          <Wand2 className="h-8 w-8 text-[var(--vj-accent)]" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          AI Lên Kế Hoạch
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          Mô tả chuyến đi bạn mong muốn, AI sẽ gợi ý lịch trình chi tiết.
          Bạn có thể xem trước và chọn thêm vào lịch hoặc đề xuất cho nhóm.
        </p>
        <div className="w-full max-w-sm space-y-2 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Gợi ý:
          </p>
          {[
            'Lên kế hoạch một ngày ở Quận 1, ghé quán cafe và ăn tối',
            'Gợi ý thêm điểm tham quan cho buổi chiều ngày mai',
            'Tìm quán ăn ngon gần đây cho bữa trưa',
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => {
                handlePlanRequest(hint);
              }}
              className="w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:border-[var(--vj-accent)]/40 hover:bg-orange-50/40 transition-colors"
            >
              “{hint}”
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---- Planning (loading) ---- */
  function renderPlanning() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--vj-primary)] to-[var(--vj-accent)] text-white animate-pulse">
            <Bot className="h-8 w-8" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--vj-accent)]" />
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">
          AI đang lên kế hoạch...
        </h3>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          Đang phân tích yêu cầu của bạn và tìm kiếm địa điểm phù hợp.
        </p>
        <div className="mt-6 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-[var(--vj-accent)] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Chat response ---- */
  function renderChatResponse() {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--vj-primary)] to-[var(--vj-accent)] text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-700 leading-relaxed max-w-[85%]">
            <div
              dangerouslySetInnerHTML={{
                __html: hfResponse && 'itinerary_markdown' in hfResponse
                  ? renderMarkdown(hfResponse.itinerary_markdown)
                  : 'Xin chào! Bạn muốn lên kế hoạch đi chơi ở đâu?',
              }}
            />
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 py-2">
          Trả lời AI ở ô bên dưới để tiếp tục
        </div>
      </div>
    );
  }

  /* ---- Plan display ---- */
  function renderPlanDisplay() {
    if (!hfResponse || hfResponse.status !== 'success') return null;
    const { itinerary_markdown, timeline, total_cost } = hfResponse;

    return (
      <div className="flex flex-col gap-4">
        {/* Markdown itinerary */}
        <Card className="p-4 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <div
            className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(itinerary_markdown) }}
          />
        </Card>

        {/* Cost badge */}
        {total_cost && total_cost !== '0 VNĐ' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>Tổng chi phí ước tính: <strong>{total_cost}</strong></span>
          </div>
        )}

        {/* Timeline preview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Đề xuất ({timeline.length} hoạt động)
          </h4>
          {timeline.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-[var(--vj-accent)]/30 transition-colors"
            >
              {/* Time badge */}
              <div className="flex shrink-0 flex-col items-center min-w-[64px]">
                <span className="text-[10px] font-bold text-[var(--vj-accent)] bg-orange-50 px-2 py-0.5 rounded-full">
                  {event.time}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 border-slate-200 text-slate-500"
                  >
                    {getCategoryBadge(event.activity)}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-slate-800 mt-1 leading-snug">
                  {event.activity}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
                {event.cost_estimate && (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span>{Number(event.cost_estimate).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button
            className="flex-1 gap-2"
            onClick={() => handleExecutePlan('DIRECT_ADD')}
            disabled={phase === 'executing'}
          >
            <CheckCircle2 className="h-4 w-4" />
            Thêm vào lịch trình
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleExecutePlan('PROPOSAL')}
            disabled={phase === 'executing'}
          >
            <Send className="h-4 w-4" />
            Đề xuất cho nhóm
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  function renderError() {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">Có lỗi xảy ra</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          {errorMessage || 'Không thể kết nối đến AI hoặc xử lý yêu cầu.'}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetPanel}
          >
            Bắt đầu lại
          </Button>
          <Button onClick={handlePlanRequest}>
            <Loader2 className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Executing ---- */
  function renderExecuting() {
    return (
      <div className="flex flex-col gap-3 py-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Đang thực thi kế hoạch...
        </h4>
        {executingEvents.map((ev) => (
          <div
            key={ev.index}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              ev.status === 'pending'
                ? 'border-slate-200 bg-white'
                : ev.status === 'in_progress'
                  ? 'border-blue-200 bg-blue-50'
                  : ev.status === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
            }`}
          >
            {/* Status icon */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              {ev.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
              )}
              {ev.status === 'in_progress' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {ev.status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
              {ev.status === 'skipped' && (
                <XCircle className="h-5 w-5 text-amber-500" />
              )}
              {ev.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${
                ev.status === 'success' ? 'text-emerald-800' :
                ev.status === 'error' ? 'text-red-800' :
                ev.status === 'skipped' ? 'text-amber-800' :
                'text-slate-700'
              }`}>
                {ev.label}
              </p>
              {ev.errorMessage && (
                <p className="text-[11px] text-red-600 mt-0.5">{ev.errorMessage}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Execution result ---- */
  function renderExecutionResult() {
    if (!executionSummary) return null;

    const hasErrors = executionSummary.errors > 0 || executionSummary.skipped > 0;
    const allSuccess = executionSummary.errors === 0 && executionSummary.skipped === 0;

    return (
      <div className="flex flex-col gap-4">
        {/* Summary card */}
        <Card
          className={`p-5 border-2 text-center ${
            allSuccess
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
              : hasErrors
                ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
                : 'border-slate-200 bg-white'
          }`}
        >
          {allSuccess ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          ) : (
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          )}
          <h3 className="text-base font-bold text-slate-800">
            {allSuccess
              ? 'Đã thêm thành công!'
              : 'Hoàn thành, có một số vấn đề'}
          </h3>
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <div className="text-center">
              <span className="block text-lg font-black text-emerald-600">{executionSummary.success}</span>
              <span className="text-[11px] text-slate-500">Thành công</span>
            </div>
            {executionSummary.skipped > 0 && (
              <div className="text-center">
                <span className="block text-lg font-black text-amber-600">{executionSummary.skipped}</span>
                <span className="text-[11px] text-slate-500">Bỏ qua</span>
              </div>
            )}
            {executionSummary.errors > 0 && (
              <div className="text-center">
                <span className="block text-lg font-black text-red-600">{executionSummary.errors}</span>
                <span className="text-[11px] text-slate-500">Lỗi</span>
              </div>
            )}
          </div>
        </Card>

        {/* Per-event results */}
        {executingEvents.length > 0 && (
          <div className="space-y-1">
            {executingEvents.map((ev) => (
              <div
                key={ev.index}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  ev.status === 'success'
                    ? 'text-emerald-700'
                    : ev.status === 'skipped'
                      ? 'text-amber-700'
                      : ev.status === 'error'
                        ? 'text-red-700'
                        : 'text-slate-500'
                }`}
              >
                {ev.status === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {ev.status === 'skipped' && <XCircle className="h-4 w-4 shrink-0" />}
                {ev.status === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
                <span className="flex-1 truncate">{ev.label}</span>
                {ev.errorMessage && (
                  <span className="text-[11px] truncate max-w-[200px]">{ev.errorMessage}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Close / Retry */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={allSuccess ? 'default' : 'outline'}
            className="flex-1"
            onClick={onClose}
          >
            Đóng
          </Button>
          {!allSuccess && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetPanel}
            >
              Thử lại với kế hoạch mới
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ---- Utility ---- */

  function getExecutionSummaryText(): string {
    if (!executionSummary) return '';
    const { success, skipped, errors, total } = executionSummary;
    const parts: string[] = [];
    if (success > 0) parts.push(`${success}/${total} thành công`);
    if (skipped > 0) parts.push(`${skipped} bỏ qua`);
    if (errors > 0) parts.push(`${errors} lỗi`);
    return parts.join(', ');
  }

  function getCategoryBadge(activity: string): string {
    const lower = (activity || '').toLowerCase();
    if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('uống') || lower.includes('trà')) {
      return 'Đồ uống';
    }
    if (lower.includes('ăn') || lower.includes('nhà hàng') || lower.includes('bữa') || lower.includes('lẩu')) {
      return 'Ẩm thực';
    }
    return 'Hoạt động';
  }

  function renderMarkdown(md: string): string {
    if (!md) return '';
    // Basic markdown-to-HTML conversion for the agent's itinerary
    return md
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold text-slate-800 mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-black text-slate-800 mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-black text-slate-800 mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="text-sm text-slate-600 ml-4 list-disc">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-sm text-slate-600 mb-2">')
      .replace(/\n/g, '<br/>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return match;
      });
  }
};
