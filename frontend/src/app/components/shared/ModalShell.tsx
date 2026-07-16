import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../ui/utils";

interface ModalShellProps {
  /** Accessible title (visually hidden - the visible header stays inside children). */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes for the positioned content wrapper (e.g. max width). */
  className?: string;
}

/**
 * Overlay + centered content built on Radix Dialog so every modal gets
 * Escape-to-close, overlay click, focus trap and scroll lock for free.
 * The visual card (bg-white rounded-2xl…) is provided by the caller.
 */
export function ModalShell({ title, onClose, children, className }: ModalShellProps) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-200" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4 focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-200",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
