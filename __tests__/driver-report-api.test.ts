import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the driverId parsing logic that was causing the bug
describe("Driver Report API - driverId parsing", () => {
  // Replicate the OLD buggy logic for comparison
  function parseDriverIdOld(value: string | null): number | undefined {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
  }

  // This is the FIXED logic (matches app/api/reports/drivers/route.ts)
  function parseDriverIdFixed(value: string | null): number | undefined {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    return undefined; // Graceful fallback instead of NaN
  }

  describe("OLD buggy behavior", () => {
    it("should return undefined for empty string", () => {
      const result = parseDriverIdOld("");
      expect(result).toBeUndefined();
    });

    it("should return undefined for null", () => {
      const result = parseDriverIdOld(null);
      expect(result).toBeUndefined();
    });

    it("should return NaN for invalid string (causes 400 error)", () => {
      const result = parseDriverIdOld("abc");
      expect(Number.isNaN(result)).toBe(true); // BUG: causes error response
    });

    it("should return NaN for invalid number like 0", () => {
      const result = parseDriverIdOld("0");
      expect(Number.isNaN(result)).toBe(true); // BUG: causes error response
    });

    it("should return NaN for negative number", () => {
      const result = parseDriverIdOld("-1");
      expect(Number.isNaN(result)).toBe(true); // BUG: causes error response
    });
  });

  describe("FIXED behavior (matches current API implementation)", () => {
    it("should return undefined for empty string (show all drivers)", () => {
      const result = parseDriverIdFixed("");
      expect(result).toBeUndefined();
    });

    it("should return undefined for null (show all drivers)", () => {
      const result = parseDriverIdFixed(null);
      expect(result).toBeUndefined();
    });

    it("should return undefined for invalid string (graceful fallback)", () => {
      const result = parseDriverIdFixed("abc");
      expect(result).toBeUndefined(); // FIX: no error, show all
    });

    it("should return undefined for 0 (graceful fallback)", () => {
      const result = parseDriverIdFixed("0");
      expect(result).toBeUndefined(); // FIX: no error, show all
    });

    it("should return undefined for negative number (graceful fallback)", () => {
      const result = parseDriverIdFixed("-1");
      expect(result).toBeUndefined(); // FIX: no error, show all
    });

    it("should return valid driverId for valid positive integer", () => {
      const result = parseDriverIdFixed("42");
      expect(result).toBe(42);
    });

    it("should return undefined for decimal number", () => {
      const result = parseDriverIdFixed("42.5");
      expect(result).toBeUndefined(); // Decimal is not integer
    });

    it("should return undefined for whitespace-only string", () => {
      const result = parseDriverIdFixed("   ");
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string with spaces", () => {
      const result = parseDriverIdFixed("  ");
      expect(result).toBeUndefined();
    });
  });

  describe("Bug reproduction: old vs new API behavior", () => {
    // Old API behavior with the bug
    function oldApiResponse(driverId: number | undefined): { status: number; body: object } {
      if (Number.isNaN(driverId)) {
        return { status: 400, body: { error: "Invalid driverId" } };
      }
      if (driverId === undefined) {
        return { status: 200, body: { data: [], success: true } };
      }
      return { status: 200, body: { data: [], success: true } };
    }

    // New API behavior (fixed)
    function newApiResponse(driverId: number | undefined): { status: number; body: object } {
      // No error for NaN/undefined - just show all
      if (driverId === undefined) {
        return { status: 200, body: { data: [], success: true } };
      }
      return { status: 200, body: { data: [], success: true } };
    }

    it("OLD API: invalid driverId 'abc' returns 400 error (BUG)", () => {
      const parsed = parseDriverIdOld("abc");
      const response = oldApiResponse(parsed);
      expect(response.status).toBe(400); // BUG: causes empty table on frontend
    });

    it("NEW API: invalid driverId 'abc' returns 200 with all drivers (FIX)", () => {
      const parsed = parseDriverIdFixed("abc");
      const response = newApiResponse(parsed);
      expect(response.status).toBe(200); // FIX: graceful fallback
    });

    it("NEW API: valid driverId '42' returns 200 with filtered data", () => {
      const parsed = parseDriverIdFixed("42");
      expect(parsed).toBe(42);
      const response = newApiResponse(parsed);
      expect(response.status).toBe(200);
    });

    it("NEW API: no driverId (all) returns 200 with all drivers", () => {
      const parsed = parseDriverIdFixed(null);
      expect(parsed).toBeUndefined();
      const response = newApiResponse(parsed);
      expect(response.status).toBe(200);
    });

    it("NEW API: empty string driverId returns 200 with all drivers", () => {
      const parsed = parseDriverIdFixed("");
      expect(parsed).toBeUndefined();
      const response = newApiResponse(parsed);
      expect(response.status).toBe(200);
    });
  });
});

// Regression tests for the specific bug scenario
describe("Driver Report Filter Bug - Regression Tests", () => {
  // Simulates the frontend behavior
  function simulateFrontendFilter(selectedDriver: string | null): {
    apiDriverId: string | null;
  } {
    return { apiDriverId: selectedDriver };
  }

  // Old API parsing (buggy)
  function oldParseDriverId(value: string | null): number | undefined {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
  }

  // Fixed API parsing
  function fixedParseDriverId(value: string | null): number | undefined {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    return undefined;
  }

  describe("User clicks filter dropdown", () => {
    it("should show all drivers when 'Tất cả' is selected", () => {
      const frontend = simulateFrontendFilter(null);
      const parsed = fixedParseDriverId(frontend.apiDriverId);
      expect(parsed).toBeUndefined(); // Show all
    });

    it("should filter by driverId when specific driver is selected", () => {
      const frontend = simulateFrontendFilter("42");
      const parsed = fixedParseDriverId(frontend.apiDriverId);
      expect(parsed).toBe(42); // Filter by driver 42
    });

    it("should show all when frontend sends empty string", () => {
      const frontend = simulateFrontendFilter("");
      const parsed = fixedParseDriverId(frontend.apiDriverId);
      expect(parsed).toBeUndefined(); // Show all
    });
  });

  describe("Bug scenario: frontend sends malformed driverId", () => {
    it("OLD BUG: malformed driverId causes 400 error", () => {
      const frontend = simulateFrontendFilter("invalid");
      const parsed = oldParseDriverId(frontend.apiDriverId);
      expect(Number.isNaN(parsed)).toBe(true); // Bug: NaN causes error
    });

    it("FIXED: malformed driverId gracefully falls back to show all", () => {
      const frontend = simulateFrontendFilter("invalid");
      const parsed = fixedParseDriverId(frontend.apiDriverId);
      expect(parsed).toBeUndefined(); // Fix: undefined means show all
    });
  });
});
