"use client";

import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({ title, trigger, children }: { title: string; trigger: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <Button variant="secondary" onClick={() => dialog.current?.showModal()}>{trigger}</Button>
      <dialog ref={dialog} className="ui-modal" aria-labelledby={titleId} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          dialog.current?.close();
        }
      }}>
        <div className="modal-heading"><h2 id={titleId}>{title}</h2><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
        <div className="modal-content">{children}</div>
        <div className="modal-actions"><Button variant="secondary" onClick={() => dialog.current?.close()}>Close</Button></div>
      </dialog>
    </>
  );
}
