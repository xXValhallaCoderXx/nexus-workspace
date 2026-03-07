"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: "center" | "side";
  className?: string;
  bodyClassName?: string;
  headerContent?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = "center",
  className = "",
  bodyClassName,
  headerContent,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isSidePanel = variant === "side";

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className={`fixed inset-0 z-50 flex bg-black/40 backdrop-blur-[2px] ${
        isSidePanel
          ? "items-stretch justify-end"
          : "items-center justify-center p-4"
      }`}
    >
      <div
        className={`relative bg-surface ${
          isSidePanel
            ? "flex h-full w-full max-w-[720px] flex-col overflow-hidden border-l border-border shadow-2xl"
            : "max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-xl border border-border shadow-lg"
        } ${className}`}
      >
        {headerContent ?? (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
            <h2 className="text-sm font-bold text-text">{title ?? ""}</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted2 transition-colors hover:bg-bg hover:text-text"
              aria-label="Close modal"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div
          className={
            bodyClassName ??
            (isSidePanel ? "min-h-0 flex-1 overflow-y-auto p-6" : "p-5")
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
