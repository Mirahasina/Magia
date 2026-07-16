import { useState } from "react";
import { createRoot } from "react-dom/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { cn } from "../ui/utils";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
}

function ConfirmDialogView({
  options,
  onResolve,
}: {
  options: ConfirmOptions;
  onResolve: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(true);

  const close = (value: boolean) => {
    setOpen(false);
    onResolve(value);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) close(false); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-200" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[120] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-200"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  options.danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-900",
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-bold text-gray-900 text-sm">
                  {options.title}
                </DialogPrimitive.Title>
                {options.description && (
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{options.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
              >
                {options.cancelLabel || "Annuler"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2",
                  options.danger
                    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600/40"
                    : "bg-blue-900 hover:bg-blue-950 focus-visible:ring-blue-900/40",
                )}
              >
                {options.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Promise-based replacement for window.confirm().
 * Usage: if (await confirmDialog({ title: "Supprimer ?", danger: true })) { … }
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    const cleanup = (value: boolean) => {
      resolve(value);
      // Let the closing animation play before unmounting.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 200);
    };

    root.render(<ConfirmDialogView options={options} onResolve={cleanup} />);
  });
}
