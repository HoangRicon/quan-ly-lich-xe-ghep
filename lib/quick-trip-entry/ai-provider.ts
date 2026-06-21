import type { ParsedQuickTripChunk, QuickTripCandidate } from "./types";

export interface QuickTripAiProvider {
  parse(rawText: string): Promise<Partial<QuickTripCandidate>>;
  parseMany(
    rawText: string,
    options?: QuickTripAiParseManyOptions,
  ): Promise<ParsedQuickTripChunk[]>;
}

export interface QuickTripAiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface QuickTripAiEnv {
  [key: string]: string | undefined;
  QUICK_TRIP_AI_BASE_URL?: string;
  QUICK_TRIP_AI_API_KEY?: string;
  QUICK_TRIP_AI_MODEL?: string;
}

interface QuickTripAiRequest {
  url: string;
  headers: {
    "Content-Type": string;
    Authorization: string;
  };
  body: {
    model: string;
    temperature: number;
    messages: {
      role: "system" | "user";
      content: string;
    }[];
  };
}

export interface QuickTripAiParseManyOptions {
  expectedDraftCount?: number;
}

interface QuickTripAiRequestOptions extends QuickTripAiParseManyOptions {
  mode?: "single" | "many";
}

const COMMON_FIELD_PROMPT =
  "Fields hop le: rawText, candidate, customerPhone, customerName, departure, destination, pickupLocation, dropoffLocation, departureTime ISO string, price number VND, totalSeats number, tripType ghep|bao, tripDirection oneway|roundtrip, driverId number|null, notes, confidence number 0-1, warnings string[].";

const SINGLE_SYSTEM_PROMPT = [
  "Ban tach thong tin cuoc xe ghep tu tieng Viet ngan gon.",
  "Chi tra ve JSON object, khong markdown neu co the.",
  COMMON_FIELD_PROMPT,
  "Khong tu tao thong tin neu khong co trong text. Neu mo ho, bo trong field va them warning ngan gon.",
].join(" ");

const MANY_SYSTEM_PROMPT = [
  "Ban tach mot hoac nhieu cuoc xe ghep tu tin nhan tieng Viet.",
  "Chi tra ve JSON array, khong markdown neu co the.",
  "Moi phan tu la mot draft rieng, dang { rawText, candidate } hoac object candidate co rawText.",
  COMMON_FIELD_PROMPT,
  "Hay tach theo y nghia cuoc xe, ke ca khi nhieu cuoc nam chung mot doan van.",
  "Khong ep du so luong neu text khong du cuoc. Khong tu tao thong tin neu khong co trong text.",
  "Neu mo ho, bo trong field va them warning ngan gon.",
].join(" ");

export function getQuickTripAiConfigFromEnv(
  env: QuickTripAiEnv = process.env,
): QuickTripAiConfig | null {
  const baseUrl = env.QUICK_TRIP_AI_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = env.QUICK_TRIP_AI_API_KEY?.trim();
  const model = env.QUICK_TRIP_AI_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return { baseUrl, apiKey, model };
}

export function buildQuickTripAiRequest(
  rawText: string,
  config: QuickTripAiConfig,
  options: QuickTripAiRequestOptions = {},
): QuickTripAiRequest {
  const systemPrompt =
    options.mode === "many" ? MANY_SYSTEM_PROMPT : SINGLE_SYSTEM_PROMPT;
  const userContent =
    options.mode === "many" && options.expectedDraftCount
      ? `So draft du kien: ${options.expectedDraftCount}\nNoi dung:\n${rawText}`
      : rawText;

  return {
    url: `${config.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    },
  };
}

function stripJsonFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseQuickTripAiJson(content: string): Partial<QuickTripCandidate> {
  const withoutFence = stripJsonFence(content);
  const parsed = JSON.parse(withoutFence) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as Partial<QuickTripCandidate>;
}

function toCandidateRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeAiDraft(value: unknown, index: number): ParsedQuickTripChunk | null {
  const record = toCandidateRecord(value);
  if (!record) return null;

  const nestedCandidate = toCandidateRecord(record.candidate);
  const candidateRecord = nestedCandidate ?? record;
  const rawText =
    typeof record.rawText === "string" && record.rawText.trim()
      ? record.rawText.trim()
      : typeof candidateRecord.rawText === "string" && candidateRecord.rawText.trim()
        ? candidateRecord.rawText.trim()
        : `AI draft ${index + 1}`;
  const candidate = { ...candidateRecord };
  delete candidate.rawText;
  delete candidate.candidate;

  return {
    rawText,
    candidate: candidate as Partial<QuickTripCandidate> as QuickTripCandidate,
  };
}

export function parseQuickTripAiJsonMany(content: string): ParsedQuickTripChunk[] {
  const parsed = JSON.parse(stripJsonFence(content)) as unknown;
  const drafts = Array.isArray(parsed)
    ? parsed
    : toCandidateRecord(parsed) && Array.isArray(toCandidateRecord(parsed)?.drafts)
      ? (toCandidateRecord(parsed)?.drafts as unknown[])
      : toCandidateRecord(parsed) && Array.isArray(toCandidateRecord(parsed)?.items)
        ? (toCandidateRecord(parsed)?.items as unknown[])
        : parsed && typeof parsed === "object"
          ? [parsed]
          : [];

  return drafts
    .map((draft, index) => normalizeAiDraft(draft, index))
    .filter((draft): draft is ParsedQuickTripChunk => draft !== null);
}

class OpenAiCompatibleQuickTripProvider implements QuickTripAiProvider {
  constructor(private readonly config: QuickTripAiConfig) {}

  async parse(rawText: string): Promise<Partial<QuickTripCandidate>> {
    const request = buildQuickTripAiRequest(rawText, this.config);
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      throw new Error(`AI parser request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {};
    }

    return parseQuickTripAiJson(content);
  }

  async parseMany(
    rawText: string,
    options: QuickTripAiParseManyOptions = {},
  ): Promise<ParsedQuickTripChunk[]> {
    const request = buildQuickTripAiRequest(rawText, this.config, {
      mode: "many",
      ...options,
    });
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      throw new Error(`AI parser request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return [];
    }

    return parseQuickTripAiJsonMany(content);
  }
}

export function getQuickTripAiProvider(): QuickTripAiProvider | null {
  const config = getQuickTripAiConfigFromEnv();
  return config ? new OpenAiCompatibleQuickTripProvider(config) : null;
}
