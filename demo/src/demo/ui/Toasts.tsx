import { dismiss, useToasts } from "../toasts";

export function Toasts() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="demo-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="demo-toast" role="status">
          <p className="min-w-0 flex-1">{t.message}</p>
          {t.action && (
            <button
              type="button"
              className="demo-toast-action"
              onClick={() => {
                dismiss(t.id);
                t.action!.run();
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="demo-toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
