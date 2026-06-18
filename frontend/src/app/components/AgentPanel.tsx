import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, Send, Sparkles, X } from "lucide-react";
import {
  callHuggingFaceAgent,
  executeAgentPlan,
  type ExecutePlanResponse,
  type ExecutionMode,
  type HfPlanResponse,
} from "../lib/agentApi";
import { cn } from "../lib/utils";

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timelineId: string;
  startDate: string;
  onTimelineUpdated?: () => void;
}

const quickPrompts = [
  "Gợi ý lịch trình ăn uống nhẹ nhàng trong ngày đầu.",
  "Thêm vài quán cafe và điểm check-in gần nhau.",
  "Tạo lịch trình buổi tối có ăn tối và đi dạo.",
];

export function AgentPanel({
  isOpen,
  onClose,
  timelineId,
  startDate,
  onTimelineUpdated,
}: AgentPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [sessionId] = useState(() => `vj-agent-${Date.now()}`);
  const [plan, setPlan] = useState<HfPlanResponse | null>(null);
  const [execution, setExecution] = useState<ExecutePlanResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "planning" | "executing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPrompt("");
    setSelectedDate(startDate);
    setPlan(null);
    setExecution(null);
    setStatus("idle");
    setError(null);
  }, [isOpen]);

  const canExecute = plan?.status === "success" && plan.timeline.length > 0;
  const estimatedCost = useMemo(() => {
    if (!plan || plan.status !== "success") return "";
    return plan.total_cost && plan.total_cost !== "0" ? plan.total_cost : "Chưa ước tính";
  }, [plan]);

  if (!isOpen) return null;

  async function requestPlan(event?: FormEvent<HTMLFormElement>, nextPrompt = prompt) {
    event?.preventDefault();
    const message = nextPrompt.trim();
    if (!message || status !== "idle") return;

    setStatus("planning");
    setError(null);
    setExecution(null);

    try {
      const response = await callHuggingFaceAgent(message, selectedDate, 1, sessionId);
      setPlan(response);
      if (response.status === "chat") {
        setPrompt(response.itinerary_markdown || "");
      } else {
        setPrompt("");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo gợi ý lúc này.");
    } finally {
      setStatus("idle");
    }
  }

  async function execute(mode: ExecutionMode) {
    if (!canExecute || status !== "idle") return;

    setStatus("executing");
    setError(null);

    try {
      const response = await executeAgentPlan({
        timeline: plan.timeline,
        timelineId,
        startDate: selectedDate,
        mode,
      });
      setExecution(response);
      onTimelineUpdated?.();
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "Không thể thêm gợi ý vào timeline.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_oklch(0.23_0.04_260_/_0.35)]">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-foreground">AI Planner</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Mô tả chuyến đi bạn muốn, VietJourney sẽ gợi ý các mốc thời gian để thêm vào timeline hiện tại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Đóng AI Planner"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <form onSubmit={requestPlan} className="space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-foreground">Bạn muốn AI lên lịch như thế nào?</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ví dụ: Lên lịch ngày đầu ở Đà Nẵng, ăn trưa nhẹ, chiều đi biển, tối ăn hải sản..."
                className="mt-2 min-h-28 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setPrompt(item);
                    void requestPlan(undefined, item);
                  }}
                  disabled={status !== "idle"}
                  className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!prompt.trim() || status !== "idle"}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "planning" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {status === "planning" ? "Đang tạo gợi ý..." : "Tạo gợi ý"}
            </button>
          </form>

          {error ? (
            <div className="mt-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <p className="leading-6">{error}</p>
            </div>
          ) : null}

          {plan ? (
            <div className="mt-5 rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-foreground">
                    {plan.status === "success" ? "Kế hoạch đề xuất" : "AI cần thêm thông tin"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Chi phí ước tính: {estimatedCost}</p>
                </div>
                {canExecute ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {plan.timeline.length} hoạt động
                  </span>
                ) : null}
              </div>

              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                {plan.itinerary_markdown || "AI chưa trả về mô tả chi tiết."}
              </div>

              {canExecute ? (
                <>
                  <div className="mt-4 space-y-2">
                    {plan.timeline.map((item, index) => (
                      <div key={`${item.time}-${item.activity}-${index}`} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-foreground">{item.activity}</p>
                          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary">
                            {item.time}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.location}</p>
                        {item.cost_estimate ? (
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            Dự kiến: {item.cost_estimate}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Thêm vào ngày:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => void execute("PROPOSAL")}
                      disabled={status !== "idle"}
                      className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Đề xuất cho nhóm
                    </button>
                    <button
                      type="button"
                      onClick={() => void execute("DIRECT_ADD")}
                      disabled={status !== "idle"}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "executing" ? <Loader2 className="size-4 animate-spin" /> : null}
                      Thêm vào timeline
                    </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {execution ? (
            <div className={cn(
              "mt-5 rounded-xl border p-4 shadow-sm",
              execution.successCount > 0 
                ? "border-emerald-500/30 bg-emerald-500/10" 
                : "border-destructive/30 bg-destructive/10"
            )}>
              <div className="flex items-start gap-3">
                {execution.successCount > 0 ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                )}
                <div>
                  <p className={cn(
                    "text-sm font-black",
                    execution.successCount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                  )}>
                    {execution.successCount > 0 ? "Cập nhật lịch trình thành công!" : "Không thể thêm vào lịch trình"}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                    Đã thêm thành công <strong>{execution.successCount}</strong>/{execution.totalEvents} hoạt động.
                    {execution.skippedCount > 0 ? ` Bỏ qua ${execution.skippedCount}.` : ""}
                    {execution.errorCount > 0 ? ` Bị xung đột thời gian: ${execution.errorCount}.` : ""}
                  </p>
                  {execution.successCount > 0 && (
                    <button 
                      onClick={onClose}
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/30 dark:text-emerald-300"
                    >
                      Đóng cửa sổ và xem lịch trình &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
