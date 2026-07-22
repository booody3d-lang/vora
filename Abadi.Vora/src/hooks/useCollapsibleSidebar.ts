"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "vora_sidebar_open";

export function useCollapsibleSidebar(storageKey = DEFAULT_KEY) {
  const [isOpen, setIsOpenState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsOpenState(stored === "true");
    }
    setHydrated(true);
  }, [storageKey]);

  const persist = useCallback(
    (open: boolean) => {
      setIsOpenState(open);
      localStorage.setItem(storageKey, String(open));
    },
    [storageKey]
  );

  const toggle = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }, [storageKey]);

  const setOpen = useCallback(
    (open: boolean) => {
      persist(open);
    },
    [persist]
  );

  return {
    isOpen: hydrated ? isOpen : true,
    toggle,
    setOpen,
    hydrated,
  };
}
