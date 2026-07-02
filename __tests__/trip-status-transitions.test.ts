import { describe, expect, it } from "vitest";
import {
  getValidNextStatuses,
  validateStatusTransition,
} from "../lib/trip-status-transitions";

describe("trip status transitions", () => {
  it("allows a completed trip with a driver to return to confirmed or cancelled", () => {
    expect(getValidNextStatuses("completed", true)).toEqual([
      "confirmed",
      "cancelled",
    ]);

    expect(validateStatusTransition("completed", "confirmed", 123)).toEqual({
      ok: true,
    });
    expect(validateStatusTransition("completed", "cancelled", 123)).toEqual({
      ok: true,
    });
  });

  it("does not allow returning a completed trip to confirmed without a driver", () => {
    expect(getValidNextStatuses("completed", false)).toEqual(["cancelled"]);

    const result = validateStatusTransition("completed", "confirmed", null);
    expect(result.ok).toBe(false);
  });
});
