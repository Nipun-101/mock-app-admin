import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppUser } from "@/app/services/ezprep-api/users";
import { UserCard } from "./user-card";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    name: "Anita Sharma",
    email: "anita@example.com",
    phoneNumber: "+919876543210",
    role: "user",
    isActive: true,
    location: { city: "Bengaluru", state: "KA", country: "IN" },
    subscription: { plan: "premium", status: "active" },
    membershipTier: "gold",
    targetExam: { id: "e1", name: "UPSC" },
    testsAttendedCount: 4,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("UserCard", () => {
  it("renders identity, plan, tests attended, and location", () => {
    render(<UserCard user={makeUser()} />);

    expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.getByText("a***@***.com")).toBeInTheDocument();
    expect(screen.getByText("+**********10")).toBeInTheDocument();
    expect(screen.queryByText("anita@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+919876543210")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("UPSC")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, KA, IN")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/tests attended/i)).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
  });

  it("handles inactive users and missing optional fields", () => {
    render(
      <UserCard
        user={makeUser({
          name: "",
          email: "",
          phoneNumber: undefined,
          isActive: false,
          location: undefined,
          targetExam: undefined,
          testsAttendedCount: Number.NaN,
          avatarUrl: "https://cdn.example/a.png",
        })}
      />
    );

    expect(screen.getByText("Unnamed learner")).toBeInTheDocument();
    expect(screen.getByText("No email")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText("UPSC")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("falls back to the user name when id is missing for avatar color", () => {
    render(<UserCard user={makeUser({ id: "" })} />);
    expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
  });

  it("shows a singular tests label for a single attempt", () => {
    render(<UserCard user={makeUser({ testsAttendedCount: 1 })} />);
    expect(screen.getByText(/test attended/i)).toBeInTheDocument();
  });

  it("never renders a full email or phone even if the payload is unmasked", () => {
    render(
      <UserCard
        user={makeUser({
          email: "anita.sharma@gmail.com",
          phoneNumber: "9876543210",
        })}
      />
    );

    expect(screen.getByText("a***@***.com")).toBeInTheDocument();
    expect(screen.getByText("********10")).toBeInTheDocument();
    expect(screen.queryByText("anita.sharma@gmail.com")).not.toBeInTheDocument();
    expect(screen.queryByText("9876543210")).not.toBeInTheDocument();
  });
});
