import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface SidebarContextValue {
  visible: boolean;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** Controla el sidebar del admin (drawer modal). */
export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(
    () => ({ visible, open: () => setVisible(true), close: () => setVisible(false) }),
    [visible],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useAdminSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useAdminSidebar must be used inside AdminSidebarProvider');
  }
  return ctx;
}
