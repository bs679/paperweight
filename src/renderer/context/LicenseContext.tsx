import { createContext, useCallback, useContext, useState } from "react";
import type { LicenseStatus } from "@shared/types";

// This fork has no Pro gate: the license is always active and every action is
// allowed. The context keeps upstream's hook names so call sites stay unchanged.

interface LicenseContextValue {
  license: LicenseStatus;
  allowAction: (intent: "curate" | "execute") => boolean;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export function useLicense(): LicenseStatus {
  const ctx = useContext(LicenseContext);
  return ctx?.license ?? { active: true };
}

export function useActionAccess() {
  const ctx = useContext(LicenseContext);
  return ctx?.allowAction ?? (() => true);
}

export function useRefreshLicense(): () => Promise<void> {
  const ctx = useContext(LicenseContext);
  return ctx?.refreshLicense ?? (async () => {});
}

interface LicenseProviderProps {
  initialLicense: LicenseStatus;
  children: React.ReactNode;
}

export function LicenseProvider({
  initialLicense,
  children,
}: LicenseProviderProps): JSX.Element {
  const [license, setLicense] = useState<LicenseStatus>(initialLicense);
  const allowAction = () => true;

  const refreshLicense = useCallback(async () => {
    const status = await window.api.getLicenseStatus();
    setLicense(status);
  }, []);

  return (
    <LicenseContext.Provider value={{ license, refreshLicense, allowAction }}>
      {children}
    </LicenseContext.Provider>
  );
}
