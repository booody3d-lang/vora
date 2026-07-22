"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PlatformProvider } from "@/providers/PlatformProvider";
import { resolveUserPermissions } from "@/lib/permissions/access-control";
import type { UserPermissions } from "@/types/vora";
import type { AuthUser, VoraRole } from "@/types/security";
import { roleToTier } from "@/lib/permissions/rbac-bridge";

interface PermissionsContextValue {
  permissions: UserPermissions;
  role: VoraRole;
  user: AuthUser | null;
  isLoading: boolean;
  setAuthenticatedUser: (input: {
    tier: "basic" | "professional";
    professionalUnlocked: boolean;
    hasFreelancerStore: boolean;
    hasProfessionalProfile: boolean;
  }) => void;
  setVisitor: () => void;
  refreshSession: () => Promise<void>;
}

const PermissionsCtx = createContext<PermissionsContextValue | null>(null);

const visitorDefaults = resolveUserPermissions({
  tier: "visitor",
  isAuthenticated: false,
  professionalUnlocked: false,
  hasFreelancerStore: false,
  hasProfessionalProfile: false,
});

function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<UserPermissions>(visitorDefaults);
  const [role, setRole] = useState<VoraRole>("visitor");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthUser = useCallback((authUser: AuthUser) => {
    setUser(authUser);
    setRole(authUser.role);
    setPermissions(
      resolveUserPermissions({
        tier: roleToTier(authUser.role),
        isAuthenticated: true,
        professionalUnlocked: authUser.professionalUnlocked,
        hasFreelancerStore: authUser.hasFreelancerStore,
        hasProfessionalProfile: authUser.hasProfessionalProfile,
      })
    );
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated && data.user) {
        applyAuthUser(data.user);
      } else {
        setUser(null);
        setRole("visitor");
        setPermissions(visitorDefaults);
      }
    } catch {
      setUser(null);
      setRole("visitor");
      setPermissions(visitorDefaults);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthUser]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const setAuthenticatedUser = useCallback(
    (input: {
      tier: "basic" | "professional";
      professionalUnlocked: boolean;
      hasFreelancerStore: boolean;
      hasProfessionalProfile: boolean;
    }) => {
      setPermissions(
        resolveUserPermissions({
          tier: input.tier,
          isAuthenticated: true,
          professionalUnlocked: input.professionalUnlocked,
          hasFreelancerStore: input.hasFreelancerStore,
          hasProfessionalProfile: input.hasProfessionalProfile,
        })
      );
    },
    []
  );

  const setVisitor = useCallback(() => {
    setUser(null);
    setRole("visitor");
    setPermissions(visitorDefaults);
  }, []);

  const permissionsValue = useMemo(
    () => ({ permissions, role, user, isLoading, setAuthenticatedUser, setVisitor, refreshSession }),
    [permissions, role, user, isLoading, setAuthenticatedUser, setVisitor, refreshSession]
  );

  return <PermissionsCtx.Provider value={permissionsValue}>{children}</PermissionsCtx.Provider>;
}

export function VoraProviders({ children }: { children: ReactNode }) {
  return (
    <PlatformProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </PlatformProvider>
  );
}

export { usePlatform } from "@/providers/PlatformProvider";

export function usePermissions() {
  const context = useContext(PermissionsCtx);
  if (!context) throw new Error("usePermissions must be used within VoraProviders");
  return context;
}
