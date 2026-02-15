"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Toast = {
  id: number;
  type: "success" | "error" | "loading" | "info";
  message: string;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: number) => void;
};

const ICONS: Record<Toast["type"], React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#34d399" strokeWidth="1.5" />
      <path d="M5 8.5l2 2 4-4.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#f87171" strokeWidth="1.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  loading: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="7" stroke="#3f3f46" strokeWidth="1.5" />
      <path d="M8 1a7 7 0 0 1 7 7" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#a1a1aa" strokeWidth="1.5" />
      <path d="M8 7v4M8 5v.01" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  useEffect(() => {
    if (toast.type === "loading") return;
    timerRef.current = setTimeout(dismiss, 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast.type, dismiss]);

  const borderColor =
    toast.type === "error"
      ? "border-red-500/30"
      : toast.type === "success"
        ? "border-emerald-500/30"
        : toast.type === "loading"
          ? "border-yellow-500/30"
          : "border-zinc-700";

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border bg-zinc-900/95 backdrop-blur-sm shadow-lg shadow-black/30 max-w-sm cursor-pointer select-none transition-all duration-200 ${borderColor} ${exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
      onClick={dismiss}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <span className="text-sm text-zinc-200 leading-snug">{toast.message}</span>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

/** Hook for managing toasts. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((type: Toast["type"], message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    return id;
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Replace a loading toast with a final state. */
  const resolve = useCallback((id: number, type: "success" | "error", message: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, type, message } : t)));
  }, []);

  return { toasts, push, dismiss, resolve };
}
