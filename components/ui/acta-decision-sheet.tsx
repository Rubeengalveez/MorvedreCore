"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { CSSProperties } from "react";

import styles from "@/components/matches/live-match.module.css";

interface DecisionAction {
  label: string;
  detail?: string;
  tone?: "primary" | "outline" | "danger";
  onClick: () => void | Promise<void>;
}

interface ActaDecisionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actions: DecisionAction[];
  context?: string;
  pending?: boolean;
  error?: string | null;
}

export function ActaDecisionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
  context = "Convocatoria",
  pending = false,
  error,
}: ActaDecisionSheetProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.panel} ${styles.panelDefault}`}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <div
            className={styles.panelHeaderContainer}
            style={{ borderBottom: 0, boxShadow: "none" }}
          >
            <div className={styles.panelNavBar}>
              <span className={styles.panelContextBadge}>{context}</span>
              <Dialog.Close asChild>
                <button type="button" disabled={pending} className={styles.panelNavigation}>
                  Cerrar <X size={18} aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <div className={styles.panelTitleBlock}>
              <Dialog.Title className={styles.panelTitle}>{title}</Dialog.Title>
              <Dialog.Description className="text-ink-700 mt-1 text-sm leading-snug">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className={styles.panelBody}>
            {error ? (
              <p role="alert" className="text-danger mb-2 font-bold">
                {error}
              </p>
            ) : null}
            <div className={styles.actionList}>
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={pending}
                  onClick={() => void action.onClick()}
                  className={styles.action}
                  style={
                    {
                      "--button-bg": action.tone === "primary" ? "#062048" : "#ffffff",
                      "--button-ink":
                        action.tone === "primary"
                          ? "#ffffff"
                          : action.tone === "danger"
                            ? "#991b1b"
                            : "#062048",
                      borderColor: action.tone === "danger" ? "#991b1b" : "#062048",
                    } as CSSProperties
                  }
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span>{action.label}</span>
                    {action.detail ? (
                      <span className="text-sm font-medium opacity-85">{action.detail}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
