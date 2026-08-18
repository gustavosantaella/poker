import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

interface SidebarContextValue {
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Provee el sidebar global (menú lateral). Se monta en el layout raíz, por lo que
 * cualquier pantalla puede abrirlo con `useSidebar().openSidebar()`.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openSidebar = useCallback(() => setVisible(true), []);
  const closeSidebar = useCallback(() => setVisible(false), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ openSidebar, closeSidebar }),
    [openSidebar, closeSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
      <Sidebar visible={visible} onClose={closeSidebar} />
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used inside <SidebarProvider>');
  }
  return ctx;
}
