import { describe, expect, it } from "vitest";
import { ADMIN_ROLE, APP_USER_ROLE } from "@/app/services/ezprep-api/users";
import {
  avatarColor,
  excludeAdmins,
  formatJoinedDate,
  formatLocation,
  getInitials,
  isLearnerUser,
  maskEmail,
  maskPhoneNumber,
  testsAttendedLabel,
} from "./helpers";

describe("isLearnerUser", () => {
  it("accepts only the exact learner role", () => {
    expect(isLearnerUser({ role: APP_USER_ROLE })).toBe(true);
    expect(isLearnerUser({ role: ADMIN_ROLE })).toBe(false);
    expect(isLearnerUser({ role: "ADMIN" })).toBe(false);
    expect(isLearnerUser({ role: "User" })).toBe(false);
    expect(isLearnerUser({})).toBe(false);
    expect(isLearnerUser(null)).toBe(false);
    expect(isLearnerUser(undefined)).toBe(false);
    expect(isLearnerUser({ role: 1 as unknown as string })).toBe(false);
  });
});

describe("excludeAdmins", () => {
  it("returns only learners and never lets an admin through", () => {
    const rows = excludeAdmins([
      { id: "1", role: APP_USER_ROLE, name: "Anita" },
      { id: "2", role: ADMIN_ROLE, name: "Root" },
      { id: "3", name: "No role" },
      { id: "4", role: "admin", name: "Other admin" },
    ]);
    expect(rows).toEqual([{ id: "1", role: APP_USER_ROLE, name: "Anita" }]);
    expect(rows.some((row) => row.role === ADMIN_ROLE)).toBe(false);
  });

  it("treats a missing list as empty", () => {
    expect(excludeAdmins(null)).toEqual([]);
    expect(excludeAdmins(undefined)).toEqual([]);
  });
});

describe("getInitials", () => {
  it("builds initials from a full name", () => {
    expect(getInitials("Anita Sharma")).toBe("AS");
    expect(getInitials("Anita Priya Sharma")).toBe("AS");
    expect(getInitials("anita")).toBe("AN");
    expect(getInitials("  ")).toBe("?");
    expect(getInitials()).toBe("?");
  });
});

describe("avatarColor", () => {
  it("is stable for the same seed and falls back for an empty seed", () => {
    expect(avatarColor("u1")).toBe(avatarColor("u1"));
    expect(avatarColor("u1")).not.toBe(avatarColor("u2"));
    expect(avatarColor()).toMatch(/^#/);
  });
});

describe("formatLocation", () => {
  it("joins present location parts", () => {
    expect(
      formatLocation({ city: "Bengaluru", state: "KA", country: "IN" })
    ).toBe("Bengaluru, KA, IN");
    expect(formatLocation({ city: "  ", country: "IN" })).toBe("IN");
    expect(formatLocation({})).toBeNull();
    expect(formatLocation()).toBeNull();
  });
});

describe("formatJoinedDate", () => {
  it("formats a valid ISO date and dashes invalid values", () => {
    expect(formatJoinedDate("2026-01-15T00:00:00.000Z")).toMatch(/2026/);
    expect(formatJoinedDate("not-a-date")).toBe("—");
    expect(formatJoinedDate()).toBe("—");
  });
});

describe("testsAttendedLabel", () => {
  it("pluralizes and never goes negative", () => {
    expect(testsAttendedLabel(0)).toBe("0 tests attended");
    expect(testsAttendedLabel(1)).toBe("1 test attended");
    expect(testsAttendedLabel(4)).toBe("4 tests attended");
    expect(testsAttendedLabel(-3)).toBe("0 tests attended");
    expect(testsAttendedLabel(Number.NaN)).toBe("0 tests attended");
  });
});

describe("maskEmail", () => {
  it("hides the local part and domain while keeping a lead character and TLD", () => {
    expect(maskEmail("anita@example.com")).toBe("a***@***.com");
    expect(maskEmail("Anita.Sharma@Gmail.COM")).toBe("A***@***.COM");
  });

  it("never returns the original address", () => {
    expect(maskEmail("anita.sharma@example.com")).not.toContain("anita.sharma");
    expect(maskEmail("anita.sharma@example.com")).not.toContain("example");
  });

  it("treats blank values as empty and leaves already-masked values alone", () => {
    expect(maskEmail()).toBe("");
    expect(maskEmail("  ")).toBe("");
    expect(maskEmail("a***@***.com")).toBe("a***@***.com");
  });
});

describe("maskPhoneNumber", () => {
  it("keeps a leading plus and the last two digits", () => {
    expect(maskPhoneNumber("+919876543210")).toBe("+**********10");
    expect(maskPhoneNumber("9876543210")).toBe("********10");
  });

  it("never returns the original number", () => {
    expect(maskPhoneNumber("+919876543210")).not.toContain("9876543210");
  });

  it("treats blank values as missing and leaves already-masked values alone", () => {
    expect(maskPhoneNumber()).toBeUndefined();
    expect(maskPhoneNumber("")).toBeUndefined();
    expect(maskPhoneNumber("+**********10")).toBe("+**********10");
  });
});
