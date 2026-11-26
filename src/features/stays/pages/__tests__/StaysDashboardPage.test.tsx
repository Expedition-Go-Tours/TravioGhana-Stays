/**
 * Dashboard: the operations homepage reads the mock dashboard payload, shows
 * today's five figures, filters the per-property table, links every row to a
 * real route, and keeps the two unbuilt tabs honest.
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
import { formatMoney } from "@/lib/money";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

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

function renderPage(initial = "/stays") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/stays"
            element={
              <>
                <StaysDashboardPage />
                <Location />
              </>
            }
          />
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

/** Open a Radix Select by its label and choose an option. */
async function pickSelect(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: option }));
}

const search = () => new URLSearchParams(screen.getByTestId("location").textContent?.split("?")[1] ?? "");

function propertyRows() {
  return within(screen.getByRole("list", { name: "Property operations" })).getAllByRole("listitem");
}

function stat(name: RegExp) {
  const today = screen.getByRole("region", { name: "Happening today" });
  return within(today).getByRole("link", { name });
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
  localStorage.clear();
  staysMock.reset();
  state.mockMode = true;
  state.granted = null;
  setWide(false);
  fetchDashboard.mockClear();
  loadVerification.mockClear();
  toast.success.mockClear();
  useAuthStore.setState({
    user: { id: "u1", name: "Ama Boateng", email: "ama@example.com", roles: ["supplier"] },
    supplierProfile: { status: "ACTIVE", businessName: "Akwaaba Coast Hotel Ltd" },
  } as never);
});

afterEach(() => {
  setWide(false);
});

describe("StaysDashboardPage — operations homepage", () => {
  it("greets the signed-in person and shows today's five figures", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    expect(screen.getByText(/Good (morning|afternoon|evening), Ama/)).toBeTruthy();
    expect(screen.getByText("Akwaaba Coast Hotel Ltd")).toBeTruthy();
    expect(await screen.findByRole("link", { name: /1 document to review/ })).toHaveAttribute(
      "href",
      "/stays/verification",
    );

    await screen.findByRole("region", { name: "Happening today" });
    expect(within(stat(/Reservations/)).getByText("2")).toBeTruthy();
    expect(within(stat(/Arrivals/)).getByText("1")).toBeTruthy();
    expect(within(stat(/Departures/)).getByText("1")).toBeTruthy();
    expect(within(stat(/Reviews/)).getByText("2")).toBeTruthy();
    expect(within(stat(/Cancellations/)).getByText("1")).toBeTruthy();
    expect(stat(/Reservations/).getAttribute("href")).toBe("/stays/bookings");
    expect(stat(/Reviews/).getAttribute("href")).toBe("/stays/reviews");
    expect(stat(/Cancellations/).getAttribute("href")).toBe("/stays/cancellation");
  });

  it("shows every property with its status and phone-card counts", async () => {
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    const rows = propertyRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Akwaaba Coast Hotel")).toBeTruthy();
    expect(within(rows[1]).getByText("Kumasi Gardens Lodge")).toBeTruthy();
    expect(within(rows[2]).getByText("Cape Coast Heritage Inn")).toBeTruthy();
    // Paused listings use Booking.com's "closed / not bookable" wording.
    expect(within(rows[1]).getByText("Closed / Not bookable")).toBeTruthy();
    expect(within(rows[2]).getByText("Under review")).toBeTruthy();
  });

  it("shows a property's cover from the properties list when the dashboard omits it", async () => {
    setWide(true);
    const cover = "https://cdn.example.com/akwaaba-cover.jpg";
    await staysMock.updateProperty("p1", { photos: [cover] });

    const dashboard = await staysMock.getDashboard({ period: "month-to-date", compare: "none" });
    fetchDashboard.mockResolvedValueOnce({
      ...dashboard,
      properties: dashboard.properties?.map((row) => ({ ...row, photo: null })),
    });

    renderPage();
    await screen.findByRole("region", { name: "Happening today" });
    const table = await screen.findByRole("table", { name: "Property operations" });

    await waitFor(() => {
      const covers = within(table).getAllByTestId("dashboard-property-photo");
      expect(covers.some((image) => image.getAttribute("src") === cover)).toBe(true);
    });
  });

  it("labels mock numbers as demo data, and only in mock mode", async () => {
    const { unmount } = renderPage();
    await screen.findByRole("region", { name: "Happening today" });
    expect(screen.getByText("Demo data")).toBeTruthy();
    unmount();

    state.mockMode = false;
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });
    expect(screen.queryByText("Demo data")).toBeNull();
  });

  it("filters by location, search and status, and resets back to every property", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await pickSelect(user, "Filter by location", "Kumasi (1)");
    await waitFor(() => expect(propertyRows()).toHaveLength(1));
    expect(propertyRows()[0].textContent).toContain("Kumasi Gardens Lodge");
    expect(search().get("location")).toBe("Kumasi");

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    await waitFor(() => expect(propertyRows()).toHaveLength(3));

    await user.type(screen.getByLabelText("Filter by property name"), "akwaaba");
    await waitFor(() => expect(propertyRows()).toHaveLength(1));
    expect(propertyRows()[0].textContent).toContain("Akwaaba Coast Hotel");
    expect(search().get("q")).toBe("akwaaba");

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    await pickSelect(user, "Filter by status", "Paused");
    await waitFor(() => expect(propertyRows()).toHaveLength(1));
    expect(propertyRows()[0].textContent).toContain("Kumasi Gardens Lodge");
    expect(search().get("status")).toBe("Paused");
  });

  it("shows the full operations table on wide screens and opens a property", async () => {
    setWide(true);
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole("table", { name: "Property operations" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Property",
      "Status on Travio",
      "Arrivals in next 48 hours",
      "Departures in next 48 hours",
      "Guest messages",
      "Travio messages",
    ]);

    const pausedRow = within(table)
      .getAllByRole("row")
      .find((row) => row.textContent?.includes("Kumasi Gardens Lodge"));
    expect(pausedRow?.textContent).toContain("Closed / Not bookable");

    await user.click(within(table).getByRole("link", { name: "Kumasi Gardens Lodge" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/stays/properties/p2"));
  });

  it("shows the Performance summary and per-property table", async () => {
    const user = userEvent.setup();
    const data = await staysMock.getDashboard({ period: "month-to-date", compare: "none" });
    const summary = data.performance!.summary;
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    const card = await screen.findByRole("region", { name: "Your overall performance" });

    expect(within(card).getByText("Booked avg. daily rate")).toBeTruthy();
    const tile = (label: string) => within(card).getByText(label).parentElement as HTMLElement;
    expect(tile("Booked avg. daily rate").textContent).toContain(formatMoney(summary.bookedAvgDailyRate));
    expect(tile("Stayed avg. daily rate").textContent).toContain(formatMoney(summary.stayedAvgDailyRate));
    expect(tile("Stayed earnings").textContent).toContain(formatMoney(summary.stayedEarnings));
    expect(within(card).getByText("1/3")).toBeTruthy();
    expect(within(card).getByText("properties in this group")).toBeTruthy();
    expect(within(card).getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/stays/special-offers",
    );
    expect(search().get("tab")).toBe("performance");

    const list = screen.getByRole("list", { name: "Property performance" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("Akwaaba Coast Hotel")).toBeTruthy();
    expect(within(list).getByText("Kumasi Gardens Lodge")).toBeTruthy();
    expect(within(list).getByText("Cape Coast Heritage Inn")).toBeTruthy();
  });

  it("shows the full Performance table, review scores and no-review rows", async () => {
    setWide(true);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    const table = await screen.findByRole("table", { name: "Property performance" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Property",
      "Booked avg. daily rate",
      "Stayed avg. daily rate",
      "Cancellation rate",
      "Stayed room nights",
      "Stayed earnings",
      "Review score",
      "Reservations",
      "Click-through rate (30 days)",
      "Conversion (30 days)",
    ]);
    expect(within(table).getByRole("img", { name: /Scored 9 out of 10/ })).toBeTruthy();
    expect(within(table).getAllByText("No reviews")).toHaveLength(2);
  });

  it("applies the Performance period and comparison, and shows previous-period deltas", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    await screen.findByRole("region", { name: "Your overall performance" });

    await pickSelect(user, "Compare with", "Previous period");
    await user.click(screen.getByRole("button", { name: "Show data" }));
    await waitFor(() =>
      expect(fetchDashboard).toHaveBeenLastCalledWith({
        period: "month-to-date",
        compare: "previous-period",
      }),
    );
    expect(await screen.findByText("Month-to-date · Previous period")).toBeTruthy();
    expect((await screen.findAllByText(/vs previous/)).length).toBeGreaterThan(0);

    await pickSelect(user, "Filter by period", "Last 30 days");
    await user.click(screen.getByRole("button", { name: "Show data" }));
    await waitFor(() =>
      expect(fetchDashboard).toHaveBeenLastCalledWith({
        period: "last-30-days",
        compare: "previous-period",
      }),
    );
    expect(await screen.findByText("Last 30 days · Previous period")).toBeTruthy();
  });

  it("shows the Settings insight card and property settings table", async () => {
    setWide(true);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(
      await screen.findByRole("heading", {
        name: "Strengthen your offering by understanding guest demand",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to insights" })).toHaveAttribute("href", "/stays/analytics");
    expect(search().get("tab")).toBe("settings");

    const table = await screen.findByRole("table", { name: "Property settings" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Property",
      "Travio Rewards",
      "Preferred",
      "Minimum stay",
      "Local rates",
      "Mobile rates",
      "Listing score",
    ]);
    expect(within(table).getByText("7 nights")).toBeTruthy();
    expect(within(table).getAllByText("Not eligible")).toHaveLength(5);
    expect(within(table).getAllByText("Add now")).toHaveLength(6);
    expect(within(table).queryByRole("link", { name: "Add now" })).toBeNull();
    expect(within(table).getAllByRole("progressbar", { name: "Listing score" })).toHaveLength(3);
  });

  it("applies the shared location filter to Performance and Settings", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await pickSelect(user, "Filter by location", "Kumasi (1)");

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    const performanceList = await screen.findByRole("list", { name: "Property performance" });
    expect(within(performanceList).getAllByRole("listitem")).toHaveLength(1);
    expect(within(performanceList).getByText("Kumasi Gardens Lodge")).toBeTruthy();
    const summaryCard = screen.getByRole("region", { name: "Your overall performance" });
    expect(within(summaryCard).getByText("0/1")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const settingsList = await screen.findByRole("list", { name: "Property settings" });
    expect(within(settingsList).getAllByRole("listitem")).toHaveLength(1);
    expect(within(settingsList).getByText("Kumasi Gardens Lodge")).toBeTruthy();
  });

  it("only links to pages declared in the router", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    const hrefs: string[] = [];
    const collect = () => {
      hrefs.push(...screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? ""));
    };
    collect();

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    await screen.findByRole("region", { name: "Your overall performance" });
    collect();

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Strengthen your offering by understanding guest demand" });
    collect();

    const routes = declaredRoutes();
    expect(hrefs.length).toBeGreaterThan(8);
    for (const href of hrefs) {
      const path = href.split(/[?#]/)[0];
      expect(routes.some((route) => route.test(path)), `${href} is not a route`).toBe(true);
    }
    expect(hrefs).not.toContain("/finance");
    expect(hrefs).toContain("/stays/special-offers");
    expect(hrefs).toContain("/stays/analytics");
  });

  it("hides actions and links the viewer cannot open", async () => {
    state.granted = new Set(["chat.view"]);
    renderPage();

    const today = await screen.findByRole("region", { name: "Happening today" });
    // Cancellation is open to every role; bookings and reviews are not.
    expect(within(today).getByRole("link", { name: /Cancellations/ })).toBeTruthy();
    expect(within(today).queryByRole("link", { name: /Reservations/ })).toBeNull();
    expect(within(today).queryByRole("link", { name: /Reviews/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Add new property/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /document to review/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Akwaaba Coast Hotel" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Performance" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeTruthy();
    expect(loadVerification).not.toHaveBeenCalled();
  });

  it("records the feedback answer locally", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    const group = screen.getByRole("group", { name: "Was this data helpful?" });
    await user.click(within(group).getByRole("button", { name: "Yes, this was helpful" }));

    expect(await screen.findByText(/we've noted your answer/)).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Thanks for your feedback.");
    expect(localStorage.getItem("stays.dashboard.feedback.v2.operations")).toBe("up");
    expect(within(group).getByRole("button", { name: "Yes, this was helpful" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("downloads the filtered table", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(toast.success).toHaveBeenCalledWith("Download started.");
  });

  it("renders Performance and Settings when the API omits the optional blocks", async () => {
    const actual = await vi.importActual<typeof import("../../api")>("../../api");
    const real = await actual.fetchStaysDashboard();
    fetchDashboard.mockResolvedValueOnce({ ...real, performance: undefined, settings: undefined });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("region", { name: "Happening today" });

    expect(screen.queryByText("This feature isn't available on your account yet")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    expect(await screen.findByRole("region", { name: "Your overall performance" })).toBeTruthy();
    const performanceList = screen.getByRole("list", { name: "Property performance" });
    expect(within(performanceList).getAllByRole("listitem")).toHaveLength(3);

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const settingsList = await screen.findByRole("list", { name: "Property settings" });
    expect(within(settingsList).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("This feature isn't available on your account yet")).toBeNull();
  });

  it("shows a retryable error when the dashboard fails to load", async () => {
    const user = userEvent.setup();
    fetchDashboard.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("We couldn't load your dashboard")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Happening today" })).toBeNull();

    await user.click(within(alert).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("region", { name: "Happening today" })).toBeTruthy();
    expect(fetchDashboard).toHaveBeenCalledTimes(2);
  });

  it("explains a 404 as not available yet, not as an error", async () => {
    fetchDashboard.mockRejectedValueOnce(notFound("/stays/supplier/dashboard"));
    renderPage();

    expect(await screen.findByText("This feature isn't available on your account yet")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  it("says when there are no properties to show", async () => {
    const actual = await vi.importActual<typeof import("../../api")>("../../api");
    const real = await actual.fetchStaysDashboard();
    fetchDashboard.mockResolvedValueOnce({ ...real, properties: [], topProperties: [] });
    renderPage();

    expect(await screen.findByText("No properties match")).toBeTruthy();
  });
});
