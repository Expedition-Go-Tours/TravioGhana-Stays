/**
 * Which backend the Stays workspace talks to.
 *
 *  - `api`  — the live supplier API.
 *  - `mock` — the bundled demo dataset, with a seeded owner session that has
 *             every permission (`lib/mockSession`).
 *
 * Because `mock` signs everyone in as an owner, it is only ever chosen on an
 * exact match. A typo used to fall through to mock mode; now an unrecognised
 * value is a configuration error and the app refuses to start, and a
 * production build also needs `VITE_ALLOW_MOCK_IN_PROD=true` (a deliberate
 * public demo deploy).
 */
export type DataSource = "mock" | "api";

export type DataSourceResolution = {
  source: DataSource;
  /** Set when the app must not start; `source` is then the safe `api`. */
  error: string | null;
};

export function resolveDataSource(options: {
  value: unknown;
  isProductionBuild: boolean;
  allowMockInProd: boolean;
}): DataSourceResolution {
  const raw = typeof options.value === "string" ? options.value.trim().toLowerCase() : "";

  if (raw !== "mock" && raw !== "api") {
    return {
      source: "api",
      error:
        `VITE_STAYS_DATA_SOURCE must be "api" or "mock" (got ${JSON.stringify(options.value)}). ` +
        "Fix the value in your environment and rebuild.",
    };
  }

  if (raw === "mock" && options.isProductionBuild && !options.allowMockInProd) {
    return {
      source: "api",
      error:
        'This production build was configured with VITE_STAYS_DATA_SOURCE="mock", which signs every ' +
        'visitor in as a demo owner. Set it to "api", or set VITE_ALLOW_MOCK_IN_PROD=true for a ' +
        "deliberate demo deployment.",
    };
  }

  return { source: raw, error: null };
}
