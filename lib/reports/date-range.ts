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

function parseHoChiMinhDayStart(value: string, hours = 0, minutes = 0): Date {
  const { year, month, day } = parseHoChiMinhDateParts(value);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
      HO_CHI_MINH_UTC_OFFSET_MS
  );
}

function parseHoChiMinhDayEnd(value: string, hours = 23, minutes = 59, seconds = 59): Date {
  const { year, month, day } = parseHoChiMinhDateParts(value);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes, seconds, 999) -
      HO_CHI_MINH_UTC_OFFSET_MS
  );
}

export function parseReportDateRange(
  startDate?: string | null,
  endDate?: string | null,
  startTime?: string | null,
  endTime?: string | null
): ReportDateRange {
  const current: ReportRangeFilter = {};

  if (startDate) {
    const sH = startTime ? parseInt(startTime.split(":")[0]) : 0;
    const sMin = startTime ? parseInt(startTime.split(":")[1]) : 0;
    current.gte = parseHoChiMinhDayStart(startDate, sH, sMin);
  }

  if (endDate) {
    const eH = endTime ? parseInt(endTime.split(":")[0]) : 23;
    const eMin = endTime ? parseInt(endTime.split(":")[1]) : 59;
    current.lte = parseHoChiMinhDayEnd(endDate, eH, eMin);
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
