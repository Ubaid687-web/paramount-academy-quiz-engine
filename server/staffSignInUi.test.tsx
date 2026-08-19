import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StaffSignIn from "../client/src/pages/StaffSignIn";

const authMock = vi.hoisted(() => ({ user: null as null | { role: "user" | "teacher" | "admin"; email?: string }, loading: false }));
const navigate = vi.fn();

vi.mock("@/components/AcademyShell", () => ({ AcademyShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...authMock, isAuthenticated: Boolean(authMock.user) }) }));
vi.mock("@/const", () => ({ getLoginUrl: () => "https://identity.example.test/sign-in" }));
vi.mock("wouter", () => ({ useLocation: () => ["/staff-sign-in", navigate] }));

describe("staff sign-in experience", () => {
  afterEach(() => { cleanup(); authMock.user = null; authMock.loading = false; navigate.mockReset(); });

  it("uses one real secure identity handoff and states that staff approval happens after sign-in", () => {
    render(<StaffSignIn />);
    expect(screen.getByText("Sign in before staff access.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue to secure sign in" })).toBeTruthy();
    expect(screen.getByText(/does not collect or store staff passwords, mobile numbers, or separate Google credentials/i)).toBeTruthy();
    expect(screen.getByText(/Approval happens after identity verification/i)).toBeTruthy();
  });

  it("shows the current role after sign-in without granting access through the page", () => {
    authMock.user = { role: "user", email: "new.staff@example.com" };
    render(<StaffSignIn />);
    expect(screen.getByText("No staff role yet")).toBeTruthy();
    expect(screen.getByText("new.staff@example.com")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Return to Quiz Centre" }));
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
