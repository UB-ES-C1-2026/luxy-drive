import { type ReactNode, useEffect, useId, useRef } from "react";
import { IconButton } from "./button";
import { X } from "./icons";
import { cx } from "./utils";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Botones de acción al pie. */
  footer?: ReactNode;
  className?: string;
};

/** Modal sobre <dialog> nativo con el scrim al 50%. Cierra con Esc o con la X. */
export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cx(
        "m-auto w-[calc(100%-2rem)] max-w-xl rounded-md bg-canvas p-0 text-ink shadow-float backdrop:bg-scrim/50",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <IconButton variant="ghost" size="sm" aria-label="Cerrar" onClick={onClose}>
          <X aria-hidden />
        </IconButton>
        <h2 id={titleId} className="text-title-md">
          {title}
        </h2>
        <span aria-hidden className="size-8" />
      </div>
      <div className="px-6 py-6">{children}</div>
      {footer && (
        <div className="flex items-center justify-between gap-4 border-t border-hairline px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
