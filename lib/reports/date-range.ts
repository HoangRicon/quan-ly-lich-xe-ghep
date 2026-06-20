export type ReportRangeFilter = {
  gte?: Date;
  lte?: Date;
};

export type ReportDateRange = {
  current: ReportRangeFilter;
  previousRange?: ReportRangeFilter;
};

const HO_CHI_MINH_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseHoChiMinhDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function parseHoChiMinhDayStart(value: string): Date {
  const { year, month, day } = parseHoChiMinhDateParts(value);
  return new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) -
      HO_CHI_MINH_UTC_OFFSET_MS
  );
}

function parseHoChiMinhDayEnd(value: string): Date {
  const { year, month, day } = parseHoChiMinhDateParts(value);
  return new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 999) -
      HO_CHI_MINH_UTC_OFFSET_MS
  );
}

export function parseReportDateRange(
  startDate?: string | null,
  endDate?: string | null
): ReportDateRange {
  const current: ReportRangeFilter = {};

  if (startDate) {
    current.gte = parseHoChiMinhDayStart(startDate);
  }

  if (endDate) {
    current.lte = parseHoChiMinhDayEnd(endDate);
  }

  if (!current.gte || !current.lte) {
    return { current };
  }

  const duration = current.lte.getTime() - current.gte.getTime();
  const previousRange = {
    gte: new Date(current.gte.getTime() - duration - 1),
    lte: new Date(current.lte.getTime() - duration - 1),
  };

  return { current, previousRange };
}
