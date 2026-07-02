import { expect, it } from "vitest";
import {
  buildDashboardUrl,
  parseDashboardFilterValue,
} from "./url-state";

it("parses only the supported active status from search params", () => {
  expect(parseDashboardFilterValue("active")).toBe("active");
  expect(parseDashboardFilterValue(["active", "ignored"])).toBe("active");
  expect(parseDashboardFilterValue("all")).toBe("all");
  expect(parseDashboardFilterValue("paused")).toBe("all");
  expect(parseDashboardFilterValue(undefined)).toBe("all");
});

it("builds the dashboard url by adding or removing the active status query param", () => {
  expect(buildDashboardUrl("/", "", "active")).toBe("/?status=active");
  expect(buildDashboardUrl("/", "?status=active", "all")).toBe("/");
  expect(buildDashboardUrl("/", "?foo=1", "active")).toBe("/?foo=1&status=active");
});
