import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportTable } from "../components/reports/report-table";

type Row = {
  id: number;
  name: string;
};

describe("ReportTable pagination", () => {
  it("renders pagination controls for both mobile cards and desktop table", () => {
    const html = renderToStaticMarkup(
      createElement(ReportTable<Row>, {
        columns: [{ key: "name", label: "Ten" }],
        data: [{ id: 1, name: "Zom 1" }],
        loading: false,
        pagination: { page: 1, limit: 20, total: 31, totalPages: 2 },
        currentPage: 1,
        onPageChange: vi.fn(),
        sortBy: "name",
        sortOrder: "asc",
        onSort: vi.fn(),
        cardRows: (item) => [[{ label: "Ten", value: item.name }]],
        cardTitle: (item) => item.name,
      }),
    );

    expect(html.match(/aria-label="Trang sau"/g)).toHaveLength(2);
    expect(html).toContain("lg:hidden");
    expect(html).toContain("hidden lg:block");
  });
});
