import { beforeEach, describe, expect, it } from "vitest";
import { staysMock } from "../store";

/**
 * The mock mirrors the API function for function, so these two behaviours are
 * contract, not convenience: the claims filter drives the Finance > Refund
 * Requests tabs, and the payout payload drives "request this amount".
 */
beforeEach(() => staysMock.reset());

describe("getSupplierClaims(status)", () => {
  it("returns only the claims in the requested status", async () => {
    const submitted = await staysMock.getSupplierClaims("SUBMITTED");
    expect(submitted.length).toBeGreaterThan(0);
    expect(submitted.every((claim) => claim.status === "SUBMITTED")).toBe(true);

    const approved = await staysMock.getSupplierClaims("SUPPLIER_APPROVED");
    expect(approved.length).toBeGreaterThan(0);
    expect(approved.every((claim) => claim.status === "SUPPLIER_APPROVED")).toBe(true);
  });

  it("accepts the comma-separated sets the UI sends", async () => {
    const resolved = await staysMock.getSupplierClaims("SUPPLIER_APPROVED,SUPPLIER_DECLINED,RELEASED");
    expect(resolved.every((claim) => claim.status !== "SUBMITTED")).toBe(true);
    expect(resolved.length).toBeGreaterThan(0);
  });

  it("returns every claim when no filter is given", async () => {
    const all = await staysMock.getSupplierClaims();
    expect(all.length).toBeGreaterThanOrEqual(3);
  });
});

describe("createPayoutRequest(payload)", () => {
  it("respects an explicit amount, method and note", async () => {
    await staysMock.createPayoutRequest({
      amount: 123.45,
      methodId: "pm-test",
      note: "partial payout",
    });

    // The API answers `{ ok: true }`; the created row is read back from the
    // list, which is also what the Payouts tab does after submitting.
    const { requests } = await staysMock.getPayoutRequests();
    const request = requests[0];

    expect(request.amount).toBe(123.45);
    expect(request.methodId).toBe("pm-test");
    expect(request.note).toBe("partial payout");
    expect(request.currency).toBe("USD");
  });

  it("falls back to every eligible earning for the dashboard's one-click form", async () => {
    await staysMock.createPayoutRequest({});

    const { requests } = await staysMock.getPayoutRequests();
    expect(requests[0].amount).toBeGreaterThan(0);
    expect(requests[0].bookingCount).toBeGreaterThan(0);
  });
});
