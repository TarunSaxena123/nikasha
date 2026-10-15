"use client";
// Ask before replacing the strategy held in this tab (REQ-BEG-21; feature 05 design §1.8).
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { hasWork } from "@/lib/work";
import { useStore } from "@/store";

/** `guard()` resolves true when it's fine to replace: nothing held, or the user chose Replace. */
export function useReplaceGuard(): [() => Promise<boolean>, ReactNode] {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const finish = (v: boolean) => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = null;
  };
  const guard = useCallback(() => {
    const { draft, evaluation } = useStore.getState();
    if (!hasWork(draft, evaluation)) return Promise.resolve(true);
    setOpen(true);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);
  const dialog = (
    <Dialog.Root open={open} onOpenChange={(o) => !o && finish(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed inset-x-4 top-1/3 z-50 mx-auto max-w-md rounded-lg bg-surface p-6 shadow-lg" data-testid="replace-dialog">
          <Dialog.Title className="text-lg font-semibold">Replace your current strategy?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm">Your current rules and any report in this tab will be cleared.</Dialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => finish(false)}>Keep my strategy</Button>
            <Button onClick={() => finish(true)}>Replace</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  return [guard, dialog];
}
