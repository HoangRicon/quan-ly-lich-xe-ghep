"use client";

import { createContext, useContext, type ReactNode } from "react";

interface TenantContextValue {
  accountId: number;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  accountId: number;
  children: ReactNode;
}

export function TenantProvider({ accountId, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ accountId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function useAccountId(): number {
  const { accountId } = useTenant();
  return accountId;
}
