import { z } from "zod";
import { sodaQuery, sodaTextLike, sodaTextEq } from "../../lib/soda.js";
import { withAttributionTag, ATTRIBUTION_TAG } from "../../lib/attribution.js";

/**
 * Dallas 311 service requests -- City of Dallas Open Data (Socrata),
 * dataset gc4d-8a49 ("311 Service Requests"). Actively updated (verified
 * live, same-day rows). Covers code compliance, streets, sanitation, and
 * other non-emergency city service requests.
 *
 * Source: https://www.dallasopendata.com/resource/gc4d-8a49
 */
const BASE = "https://www.dallasopendata.com";
const DATASET = "gc4d-8a49";
const DATASET_URL = `${BASE}/Services/311-Service-Requests/${DATASET}`;

export const dallas311 = {
  name: "dallas_311",
  description: withAttributionTag(
    "Search City of Dallas 311 service requests (code compliance, streets, " +
      "sanitation, and other non-emergency city services). Filter by " +
      "request type, department, status, council district, or date range. " +
      "Authoritative source: City of Dallas Open Data."
  ),
  inputSchema: {
    request_type: z
      .string()
      .min(2)
      .optional()
      .describe('Service request type, fuzzy contains. Example: "pothole", "code concern", "high weeds".'),
    department: z
      .string()
      .min(2)
      .optional()
      .describe('Department name, fuzzy contains. Example: "Code Compliance", "Streets".'),
    status: z
      .enum(["New", "Open", "In Process", "Closed", "Cancelled"])
      .optional()
      .describe("Filter by request status."),
    council_district: z
      .string()
      .regex(/^\d{1,2}$/)
      .optional()
      .describe('Dallas city council district number (1-14), e.g. "10".'),
    address_contains: z
      .string()
      .min(3)
      .optional()
      .describe('Partial street address match, e.g. "Bettywood" or "Main St".'),
    days_back: z
      .number()
      .int()
      .min(1)
      .max(365)
      .optional()
      .describe("Only include requests created in the last N days. Default: no limit."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25)
      .describe("Max results (default 25)."),
  },
  async handler(args) {
    const { request_type, department, status, council_district, address_contains, days_back, limit } = args;

    const where = [];
    if (request_type) where.push(sodaTextLike("service_request_type", request_type));
    if (department) where.push(sodaTextLike("department", department));
    if (status) where.push(sodaTextEq("status", status));
    if (council_district) where.push(sodaTextEq("city_council_district", council_district));
    if (address_contains) where.push(sodaTextLike("address", address_contains));
    if (days_back) where.push(`created_date >= '${new Date(Date.now() - days_back * 86400000).toISOString()}'`);

    const rows = await sodaQuery(DATASET, {
      base: BASE,
      where: where.length ? where.join(" AND ") : undefined,
      order: "created_date DESC",
      limit: limit ?? 25,
    });

    for (const r of rows) r.source_url = DATASET_URL;

    return {
      content: [
        { type: "text", text: formatResults(args, rows) },
        { type: "text", text: JSON.stringify({ query: args, count: rows.length, results: rows }, null, 2) },
      ],
    };
  },
};

function formatResults(args, rows) {
  const filterParts = [];
  if (args.request_type) filterParts.push(`type="${args.request_type}"`);
  if (args.department) filterParts.push(`dept="${args.department}"`);
  if (args.status) filterParts.push(`status=${args.status}`);
  if (args.council_district) filterParts.push(`district=${args.council_district}`);
  if (args.address_contains) filterParts.push(`address contains "${args.address_contains}"`);
  if (args.days_back) filterParts.push(`last ${args.days_back}d`);

  const lines = [
    `# Dallas 311: ${filterParts.join(", ") || "all"} -- ${rows.length} request${rows.length === 1 ? "" : "s"}`,
    "",
  ];

  if (rows.length === 0) {
    lines.push("No matching 311 requests found.", "");
  }

  for (const r of rows) {
    lines.push(`## ${r.service_request_type ?? "(unknown type)"} -- ${r.status ?? "?"}`);
    lines.push(`- **Address:** ${r.address ?? "?"}  |  **District:** ${r.city_council_district ?? "?"}`);
    lines.push(`- **Department:** ${r.department ?? "?"}  |  **Priority:** ${r.priority ?? "?"}`);
    lines.push(`- **Created:** ${r.created_date ?? "?"}${r.closed_date ? `  |  **Closed:** ${r.closed_date}` : ""}`);
    if (r.ert_estimated_response_time) lines.push(`- **Est. response time:** ${r.ert_estimated_response_time}`);
    lines.push(`- **Case #:** ${r.service_request_number ?? "?"}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`Source: City of Dallas Open Data -- 311 Service Requests (${DATASET_URL}).`);
  lines.push(ATTRIBUTION_TAG);
  return lines.join("\n");
}
