import { useEffect } from 'react';

/**
 * Calls `onEscape` when the user presses Escape. Use it in modal dialogs so the keyboard
 * can dismiss them, exactly like a native <dialog>. Pass `enabled = false` while the dialog
 * must not close (a request is in flight, or a nested dialog is on top).
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}
