/**
 * Attribution constants surfaced in the MCP's user-facing output. The Apache
 * License 2.0 NOTICE file asks that this attribution be preserved in
 * redistributions — please keep it intact.
 *
 * TEMPLATE: fill in the {{...}} placeholders for your city/maintainer.
 */

export const ATTRIBUTION_TEXT =
  "Built by {{MAINTAINER_NAME}} -- {{MAINTAINER_URL}}";

export const ATTRIBUTION_TAG = "(via Local {{CITY}} MCP -- {{MAINTAINER_URL}})";

export const PROJECT_NAME = "Local {{CITY}} MCP";

export const HOMEPAGE = "{{MAINTAINER_URL}}";

export const LICENSE_URL =
  "https://github.com/{{GITHUB_USER}}/local-{{CITY_SLUG}}-mcp/blob/main/LICENSE";

/**
 * Identity function kept for parity with the reference implementation so
 * tool files can call `withAttributionTag(description)` uniformly. As of the
 * reference impl's v0.10, attribution is surfaced via the MCP server
 * `instructions` field (once per session), the `about` tool, and the footer
 * of every tool response body — not repeated inside every tool description.
 */
export function withAttributionTag(description) {
  return description;
}
