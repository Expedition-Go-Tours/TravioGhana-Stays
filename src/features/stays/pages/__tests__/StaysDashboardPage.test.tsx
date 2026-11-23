/**
 * Dashboard: the numbers come from the mock dataset, every link lands on a
 * real route the viewer may open, rows open the booking, and a failed or
 * not-yet-shipped endpoint gets its own state instead of empty tiles.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";

import StaysDashboardPage from "../StaysDashboardPage";
import { staysMock } from "../../mock/store";
import { useAuthStore } from "@/stores/authStore";

const state = vi.hoisted(() => ({
  mockMode: true,
  granted: null as Set<string> | null, // null = every permission
}));

vi.mock("@/hooks/useTeamRole", () => ({
  useTeamRole: () => ({ hasPermission: (permission: string) => !state.granted || state.granted.has(permission) }),
}));

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchStaysDashboard: vi.fn(actual.fetchStaysDashboard),
    get staysUsesMockData() {
      return state.mockMode;
    },
  };
});

vi.mock("../../verification/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../verification/api")>();
  return { ...actual, loadStaysVerification: vi.fn(actual.loadStaysVerification) };
});

import { fetchStaysDashboard } from "../../api";
import { loadStaysVerification } from "../../verification/api";

const fetchDashboard = vi.mocked(fetchStaysDashboard);
const loadVerification = vi.mocked(loadStaysVerification);

function Location() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/stays"]}>
        <Routes>
          <Route path="/stays" element={<StaysDashboardPage />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Force the matchMedia result so DataTable picks the table (true) or phone cards (false). */
function setWide(wide: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: wide,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function notFound(url: string) {
  const config = { url, headers: new AxiosHeaders() };
  return new AxiosError("Not found", "ERR_BAD_REQUEST", config, null, {
    status: 404,
    statusText: "Not Found",
    data: {},
    headers: {},
    config,
  });
}

/** Route patterns declared in router.tsx, as regexes ("stays/properties/:id" → /^\/stays\/properties\/[^/]+$/). */
function declaredRoutes(): RegExp[] {
  const source = readFileSync(join(__dirname, "../../../../app/router.tsx"), "utf8");
  return [...source.matchAll(/path:\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== "*")
    .map((path) => {
      const absolute = path.startsWith("/") ? path : `/${path}`;
      const pattern = absolute
        .split("/")
        .map((segment) => {
          if (segment.startsWith(":")) return segment.endsWith("?") ? "(?:/[^/]+)?" : "/[^/]+";
          return segment ? `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` : "";
        })
        .join("");
      return new RegExp(`^${pattern || "/"}$`);
    });
}

beforeEach(() => {
  staysMock.reset();
  state.mockMode = true;
  state.granted = null;
  setWide(false);
  fetchDashboard.mockClear();
  loadVerification.mockClear();
  useAuthStore.setState({
    user: { id: "u1", name: "Ama Boateng", email: "ama@example.com", roles: ["supplier"] },
    supplierProfile: { status: "ACTIVE", businessName: "Akwaaba Coast Hotel Ltd" },
  } as never);
});

afterEach(() => {
  setWide(false);
});

describe("StaysDashboardPage", () => {
  it("greets the signed-in person and shows the KPI figures", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), Ama$/ })).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel Ltd")).toBeTruthy();

    const figures = await screen.findByRole("region", { name: "Key figures" });
    const tile = (label: string) => within(figures).getByText(label).closest("div.rounded-card") as HTMLElement;
    expect(within(tile("Upcoming arrivals")).getByText("4")).toBeTruthy();
    expect(within(tile("New reservations")).getByText("1")).toBeTruthy();
    expect(within(tile("Live properties")).getByText("1")).toBeTruthy();
    expect(within(tile("Booking value")).getByText("$7,650.00")).toBeTruthy();
  });

  it("labels mock numbers as demo data, and only in mock mode", async () => {
    const { unmount } = renderPage();
    await screen.findByRole("region", { name: "Key figures" });
    expect(screen.getByText("Demo data")).toBeTruthy();
    unmount();

    state.mockMode = false;
    renderPage();
    await screen.findByRole("region", { name: "Key figures" });
    expect(screen.queryByText("Demo data")).toBeNull();
  });

  it("lists what needs doing with counts, each linking to its page", async () => {
    renderPage();

    const todo = await screen.findByRole("region", { name: "Things to do" });
    expect(within(todo).getByRole("link", { name: /Guest messages\s*3 unread/ }).getAttribute("href")).toBe("/stays/customers");
    expect(within(todo).getByRole("link", { name: /New reservations\s*1 to confirm/ }).getAttribute("href")).toBe("/stays/bookings");
    expect(within(todo).getByRole("link", { name: /Unfinished listings\s*Every listing is complete/ }).getAttribute("href")).toBe(
      "/stays/properties",
    );
    // The seeded verification payload has one document to re-upload.
    expect(
      await within(todo).findByRole("link", { name: /Verification documents\s*1 need attention/ }),
    ).toHaveAttribute("href", "/stays/verification");
    expect(within(todo).getByText("3 open")).toBeTruthy();
  });

  it("opens the booking when a reservation is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const list = await screen.findByRole("list", { name: "Recent reservations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);

    await user.click(screen.getByRole("listitem", { name: "Open booking TG-S-20493 for Sarah Johnson" }));
    expect(screen.getByTestId("location").textContent).toBe("/stays/bookings?bookingId=TG-S-20493");
  });

  it("shows the full table with a property column on wide screens", async () => {
    setWide(true);
    renderPage();

    const table = await screen.findByRole("table", { name: "Recent reservations" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["Guest", "Stay", "Property", "Amount", "Status"]);
    const row = within(table).getByRole("row", { name: "Open booking TG-S-20493 for Sarah Johnson" });
    expect(within(row).getByText("$3,000.00")).toBeTruthy();
    expect(within(row).getByText("Confirmed")).toBeTruthy();
    expect(within(row).getByText("4 nights")).toBeTruthy();
  });

  it("only links to pages declared in the router", async () => {
    renderPage();
    await screen.findByRole("list", { name: "Recent reservations" });
    await screen.findByRole("link", { name: /Verification documents/ });

    const routes = declaredRoutes();
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.length).toBeGreaterThan(8);
    for (const href of hrefs) {
      const path = href.split(/[?#]/)[0];
      expect(routes.some((route) => route.test(path)), `${href} is not a route`).toBe(true);
    }
    // The old dashboard linked to "/finance", which is not a Stays route.
    expect(hrefs).not.toContain("/finance");
    expect(hrefs).toContain("/stays/finance");
  });

  it("hides links the viewer has no permission to open", async () => {
    state.granted = new Set(["chat.view"]);
    renderPage();

    const todo = await screen.findByRole("region", { name: "Things to do" });
    expect(within(todo).getAllByRole("link")).toHaveLength(1);
    expect(within(todo).getByRole("link", { name: /Guest messages/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /List a property/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /View all/ })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Shortcuts" })).toBeNull();
    // Reservations still show, but rows are not clickable without bookings access.
    const list = screen.getByRole("list", { name: "Recent reservations" });
    expect(within(list).getAllByRole("listitem")[0].getAttribute("tabindex")).toBeNull();
    // Verification is owner territory: its payload is never requested.
    expect(loadVerification).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the dashboard fails to load", async () => {
    const user = userEvent.setup();
    fetchDashboard.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("We couldn't load your dashboard")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Key figures" })).toBeNull();

    await user.click(within(alert).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("region", { name: "Key figures" })).toBeTruthy();
    expect(fetchDashboard).toHaveBeenCalledTimes(2);
  });

  it("explains a 404 as not available yet, not as an error", async () => {
    fetchDashboard.mockRejectedValueOnce(notFound("/stays/supplier/dashboard"));
    renderPage();

    expect(await screen.findByText("This feature isn't available on your account yet")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  it("says when there are no reservations or properties yet", async () => {
    const actual = await vi.importActual<typeof import("../../api")>("../../api");
    const real = await actual.fetchStaysDashboard();
    fetchDashboard.mockResolvedValueOnce({ ...real, recentBookings: [], topProperties: [] });
    renderPage();

    expect(await screen.findByText("No reservations yet")).toBeTruthy();
    expect(screen.getByText("No properties yet")).toBeTruthy();
  });
});

describe("cancellation card", () => {
  it("shows the rate with the record-building band below ten bookings", async () => {
    renderPage();
    const card = await screen.findByRole("region", { name: "Cancellation rate" });
    expect(within(card).getByText("42.9%")).toBeTruthy();
    expect(within(card).getByText("Building your record")).toBeTruthy();
    expect(within(card).getByText("3 cancellations out of 7 reservations")).toBeTruthy();
    await waitFor(() => expect(within(card).getByRole("link", { name: /View details/ })).toHaveAttribute("href", "/stays/cancellation"));
  });
});
