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
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { usePermissions } from "@/providers/VoraProviders";
import type { FullProfessionalProfile } from "@/types/network";
import type { UserGender } from "@/types/profile";

interface CurrentProfileState {
  profileSlug: string | null;
  storeSlug: string | null;
  fullName: string;
  avatarUrl: string;
  profilePhotoUrl: string | null;
  coverImageUrl: string | null;
  professionalScore: number;
  gender?: UserGender;
  profile: FullProfessionalProfile | null;
  loading: boolean;
  subscriptionBadge: {
    iconUrl?: string;
    iconSvg?: string;
    tierNameEn?: string;
    tierNameAr?: string;
  } | null;
}

interface CurrentProfileContextValue extends CurrentProfileState {
  refresh: () => Promise<void>;
  patchProfile: (updates: Partial<FullProfessionalProfile>) => Promise<FullProfessionalProfile | null>;
  applyProfile: (profile: FullProfessionalProfile) => void;
}

const emptyState: CurrentProfileState = {
  profileSlug: null,
  storeSlug: null,
  fullName: "",
  avatarUrl: resolveAvatarUrl({}),
  profilePhotoUrl: null,
  coverImageUrl: null,
  professionalScore: 0,
  profile: null,
  loading: true,
  subscriptionBadge: null,
};

const CurrentProfileCtx = createContext<CurrentProfileContextValue | null>(null);

function buildStateFromApi(data: {
  profileSlug?: string | null;
  storeSlug?: string | null;
  gender?: UserGender;
  avatarUrl?: string;
  profile?: FullProfessionalProfile | null;
  subscription?: { badge?: CurrentProfileState["subscriptionBadge"] };
}): CurrentProfileState {
  const profile = data.profile ?? null;
  const gender = profile?.gender ?? data.gender;
  const profilePhotoUrl = profile?.profilePhotoUrl ?? null;
  const coverImageUrl = profile?.coverImageUrl ?? null;

  return {
    profileSlug: data.profileSlug ?? profile?.slug ?? null,
    storeSlug: data.storeSlug ?? null,
    fullName: profile?.fullName ?? "",
    gender,
    profilePhotoUrl,
    coverImageUrl: coverImageUrl || null,
    professionalScore: profile?.professionalScore ?? 0,
    avatarUrl:
      data.avatarUrl ??
      resolveAvatarUrl({
        photoUrl: profilePhotoUrl,
        gender,
      }),
    profile,
    loading: false,
    subscriptionBadge: data.subscription?.badge ?? null,
  };
}

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const { user } = usePermissions();
  const [state, setState] = useState<CurrentProfileState>(emptyState);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/me", { credentials: "include" });
      const data = await res.json();
      if (!data.authenticated) {
        setState({ ...emptyState, loading: false });
        return;
      }
      setState(buildStateFromApi(data));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const applyProfile = useCallback((profile: FullProfessionalProfile) => {
    setState((prev) => ({
      ...prev,
      fullName: profile.fullName,
      profilePhotoUrl: profile.profilePhotoUrl ?? null,
      coverImageUrl: profile.coverImageUrl ?? null,
      professionalScore: profile.professionalScore,
      avatarUrl: resolveAvatarUrl({
        photoUrl: profile.profilePhotoUrl,
        gender: profile.gender ?? prev.gender,
      }),
      gender: profile.gender ?? prev.gender,
      profileSlug: profile.slug,
      profile,
      loading: false,
    }));
  }, []);

  const patchProfile = useCallback(async (updates: Partial<FullProfessionalProfile>) => {
    let snapshot: CurrentProfileState | null = null;

    setState((prev) => {
      if (!prev.profile) return prev;
      snapshot = prev;
      const nextProfile = { ...prev.profile, ...updates };
      return {
        ...prev,
        fullName: updates.fullName ?? prev.fullName,
        profilePhotoUrl:
          updates.profilePhotoUrl !== undefined
            ? updates.profilePhotoUrl ?? null
            : prev.profilePhotoUrl,
        coverImageUrl:
          updates.coverImageUrl !== undefined
            ? updates.coverImageUrl ?? null
            : prev.coverImageUrl,
        avatarUrl: resolveAvatarUrl({
          photoUrl:
            updates.profilePhotoUrl !== undefined
              ? updates.profilePhotoUrl
              : prev.profilePhotoUrl,
          gender: updates.gender ?? prev.gender ?? prev.profile.gender,
        }),
        gender: updates.gender ?? prev.gender,
        professionalScore: updates.professionalScore ?? nextProfile.professionalScore,
        profile: nextProfile,
      };
    });

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      setState((prev) => ({
        ...prev,
        ...buildStateFromApi({
          profileSlug: data.profile.slug,
          profile: data.profile,
          gender: data.profile.gender,
        }),
      }));

      return data.profile as FullProfessionalProfile;
    } catch {
      if (snapshot) setState(snapshot);
      return null;
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refresh();
    } else {
      setState({ ...emptyState, loading: false });
    }
  }, [user?.id, refresh, user]);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      patchProfile,
      applyProfile,
    }),
    [state, refresh, patchProfile, applyProfile]
  );

  return <CurrentProfileCtx.Provider value={value}>{children}</CurrentProfileCtx.Provider>;
}

export function useCurrentProfile() {
  const context = useContext(CurrentProfileCtx);
  if (!context) {
    throw new Error("useCurrentProfile must be used within CurrentProfileProvider");
  }
  return context;
}
