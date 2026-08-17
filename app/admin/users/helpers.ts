import { APP_USER_ROLE, ADMIN_ROLE, type AppUser } from "@/app/services/ezprep-api/users";

export function isLearnerUser(user: { role?: string } | null | undefined): boolean {
  if (!user || typeof user.role !== "string") {
    return false;
  }
  if (user.role === ADMIN_ROLE) {
    return false;
  }
  return user.role === APP_USER_ROLE;
}

export function excludeAdmins<T extends { role?: string }>(users: T[] | null | undefined): T[] {
  if (!Array.isArray(users)) {
    return [];
  }
  return users.filter(isLearnerUser);
}

export function getInitials(name?: string): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function avatarColor(seed?: string): string {
  const palette = [
    "#1677ff",
    "#722ed1",
    "#13c2c2",
    "#eb2f96",
    "#fa8c16",
    "#52c41a",
    "#2f54eb",
    "#08979c",
  ];
  const text = seed ?? "";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash + text.charCodeAt(i) * (i + 1)) % palette.length;
  }
  return palette[hash];
}

export function formatLocation(location?: AppUser["location"]): string | null {
  if (!location) {
    return null;
  }
  const parts = [location.city, location.state, location.country].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatJoinedDate(value?: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function testsAttendedLabel(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return safe === 1 ? "1 test attended" : `${safe} tests attended`;
}

/**
 * Display-only mask. The API already redacts email; this is a second
 * barrier so a full address never renders even if a payload regresses.
 */
export function maskEmail(value?: string | null): string {
  if (typeof value !== "string") {
    return "";
  }

  const email = value.trim();
  if (!email) {
    return "";
  }
  if (email.includes("*")) {
    return email;
  }

  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return `${email[0]}***`;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf(".");
  const tld = lastDot > 0 ? domain.slice(lastDot) : "";
  const lead = local[0] && /[a-z0-9]/i.test(local[0]) ? local[0] : "*";

  return `${lead}***@***${tld}`;
}

/**
 * Display-only mask. The API already redacts phone numbers; this is a
 * second barrier so a full number never renders even if a payload regresses.
 */
export function maskPhoneNumber(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const phone = value.trim();
  if (!phone) {
    return undefined;
  }
  if (phone.includes("*")) {
    return phone;
  }

  const plus = phone.startsWith("+") ? "+" : "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) {
    return `${plus}****`;
  }
  if (digits.length <= 2) {
    return `${plus}${"*".repeat(digits.length)}`;
  }

  const visible = digits.slice(-2);
  const hidden = Math.max(digits.length - 2, 4);
  return `${plus}${"*".repeat(hidden)}${visible}`;
}
