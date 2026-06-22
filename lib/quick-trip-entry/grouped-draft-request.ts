export interface GroupedDraftRequest {
  count: number;
  detail: string;
}

const VIETNAMESE_NUMBER_WORDS: Record<string, number> = {
  mot: 1,
  motj: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

const COUNT_WORD_PATTERN =
  "mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi";
const COUNT_PATTERN = `\\d{1,2}|${COUNT_WORD_PATTERN}`;
const DRAFT_NOUN_PATTERN =
  "(?:cuoc(?:\\s+xe)?|chuyen(?:\\s+xe)?|ban\\s+nhap|draft)";
const RAW_COUNT_PATTERN =
  "\\d{1,2}|mot|một|hai|ba|bon|bốn|tu|tư|nam|năm|sau|sáu|bay|bảy|tam|tám|chin|chín|muoi|mười";
const RAW_DRAFT_NOUN_PATTERN =
  "(?:cuoc|cuốc)(?:\\s+xe)?|(?:chuyen|chuyến)(?:\\s+xe)?|(?:ban\\s+nhap|bản\\s+nháp)|draft";
const RAW_COMMAND_PATTERN =
  "(?:tao|tạo|them|thêm|lap|lập|can|cần|giup|giúp|xin)";
const GROUP_PREFIX_PATTERN = new RegExp(
  `^\\s*(?:(?:tao|them|lap|can|giup|xin)\\s+)?(?<count>${COUNT_PATTERN})\\s+${DRAFT_NOUN_PATTERN}\\s*[:：]?\\s*(?<detail>.*?)\\s*$`,
  "i",
);
const GROUP_BOUNDARY_PATTERN = new RegExp(
  `\\s+(?:va|và|and)\\s+(?=(?:(?:${RAW_COMMAND_PATTERN})\\s+)?(?:${RAW_COUNT_PATTERN})\\s+(?:${RAW_DRAFT_NOUN_PATTERN})\\b)`,
  "gi",
);

export function normalizeVietnameseText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase();
}

function parseCount(value: string) {
  const normalized = normalizeVietnameseText(value);
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return VIETNAMESE_NUMBER_WORDS[normalized];
}

function cleanGroupDetail(detail: string, fallback: string) {
  const cleaned = detail
    .replace(/^[\s,.;:|/\\-]+|[\s,.;:|/\\-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback.trim();
}

function normalizeGroupBoundaries(rawText: string) {
  return rawText.replace(GROUP_BOUNDARY_PATTERN, ", ").replace(/\n+/g, ",");
}

export function getGroupedDraftRequests(rawText: string): GroupedDraftRequest[] {
  const normalized = normalizeGroupBoundaries(rawText);
  const segments = normalized
    .split(/[;,]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const groups: GroupedDraftRequest[] = [];

  for (const segment of segments) {
    const normalizedSegment = normalizeVietnameseText(segment);
    const match = normalizedSegment.match(GROUP_PREFIX_PATTERN);
    const rawCount = match?.groups?.count;
    if (!rawCount) continue;

    const count = parseCount(rawCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) continue;

    groups.push({
      count,
      detail: cleanGroupDetail(
        segment.slice(match[0].length - (match.groups?.detail?.length ?? 0)),
        segment,
      ),
    });
  }

  return groups;
}

export function inferGroupedDraftCount(rawText: string): number | undefined {
  const groups = getGroupedDraftRequests(rawText);
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  return total >= 2 ? total : undefined;
}

export function expandGroupedDraftRequests(rawText: string): string[] {
  const groups = getGroupedDraftRequests(rawText);

  if (groups.length === 0) {
    return [];
  }

  return groups.flatMap((group) =>
    Array.from({ length: group.count }, () => group.detail),
  );
}
