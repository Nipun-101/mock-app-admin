import { ezPrepApiClient } from "./browser-client";
import { ApiListResponse } from "./envelope";

export const APP_USER_ROLE = "user" as const;
export const ADMIN_ROLE = "admin" as const;

export type AppUserRole = typeof APP_USER_ROLE;

export interface AppUserLocation {
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}

export interface AppUserSubscription {
  plan: "free" | "basic" | "premium" | "enterprise";
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
}

export interface AppUserTargetExam {
  id: string;
  name: string;
}

/**
 * Learner directory row. `role` is always `"user"` — admins are excluded
 * by the API and again in the UI before render.
 * `email` and `phoneNumber` are masked by the API (`a***@gmail.com`,
 * `+91**********`). The UI also remasks before render.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: AppUserRole;
  isActive: boolean;
  gender?: string;
  location?: AppUserLocation;
  subscription?: AppUserSubscription;
  membershipTier?: "none" | "bronze" | "silver" | "gold" | "platinum";
  badgesEarnedCount?: number;
  targetExam?: AppUserTargetExam;
  testsAttendedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListAppUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const usersApi = {
  list(searchParams?: ListAppUsersParams) {
    const params: Record<string, string | number | undefined> = {};
    if (searchParams?.page != null) params.page = searchParams.page;
    if (searchParams?.limit != null) params.limit = searchParams.limit;
    if (searchParams?.search?.trim()) params.search = searchParams.search.trim();

    return ezPrepApiClient.get<ApiListResponse<AppUser>>("/v1/admin/users", {
      searchParams: params,
    });
  },
};
