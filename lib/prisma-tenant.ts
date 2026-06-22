/* eslint-disable @typescript-eslint/no-explicit-any */

import { getCurrentPrismaClient } from "./prisma";
import { getPrismaDelegate } from "./prisma-client-guards";

const TENANT_MODELS = new Set([
  "user",
  "trip",
  "tripEvent",
  "booking",
  "customer",
  "tripCustomer",
  "notification",
  "pushSubscription",
  "quickTripEntrySession",
  "quickTripEntryItem",
  "userSettings",
]);

// Maps simple keys to their composite unique key names used in Prisma's WhereUniqueInput.
// Key = the key name used in the API call's where clause
// Value = the composite unique key field name that Prisma generates
const MODEL_COMPOSITE_KEYS: Record<string, Record<string, string>> = {
  customer: {
    phone: "idx_customers_account_phone",
  },
  pushSubscription: {
    endpoint: "idx_push_subscriptions_account_endpoint",
  },
  userSettings: {
    userId: "idx_user_settings_account_user",
  },
};

function injectAccountId(where: any, accountId: number) {
  if (where && typeof where === "object") {
    return { ...where, accountId };
  }
  return { accountId };
}

function injectAccountIdToData(data: any, accountId: number) {
  if (data && typeof data === "object") {
    return { ...data, accountId };
  }
  return { accountId };
}

function injectAccountIdToCreateManyData(data: any, accountId: number) {
  if (Array.isArray(data)) {
    return data.map((item) => injectAccountIdToData(item, accountId));
  }
  return injectAccountIdToData(data, accountId);
}

/**
 * Transforms a flat unique key into the composite unique key format
 * that Prisma expects.
 *
 * Example:
 *   { phone: "0123456789" } + accountId: 4
 *   → { idx_customers_account_phone: { phone: "0123456789", accountId: 4 } }
 *
 * If no mapping exists for the model/simple key, falls back to flat merge.
 */
function toCompositeUniqueWhere(
  modelName: string,
  where: any,
  accountId: number
): any {
  if (!where || typeof where !== "object") {
    return { accountId };
  }

  const compositeKeys = MODEL_COMPOSITE_KEYS[modelName];
  if (!compositeKeys) {
    return { ...where, accountId };
  }

  // Find if any key in the where clause matches a known simple key
  for (const [simpleKey, compositeKey] of Object.entries(compositeKeys)) {
    if (simpleKey in where) {
      return {
        [compositeKey]: {
          [simpleKey]: where[simpleKey],
          accountId,
        },
      };
    }
  }

  // No matching simple key found, fall back to flat merge
  return { ...where, accountId };
}

function mapQuickEntrySession(row: any) {
  return {
    id: row.id,
    name: row.name,
    sourceType: row.sourceType,
    status: row.status,
    lastInputAt: row.lastInputAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    accountId: row.accountId,
    createdById: row.createdById,
  };
}

function mapQuickEntryItem(row: any) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    accountId: row.accountId,
    rawText: row.rawText,
    source: row.source,
    parseStatus: row.parseStatus,
    parsedData: row.parsedData,
    missingFields: row.missingFields,
    warnings: row.warnings,
    confidence: row.confidence,
    createdTripId: row.createdTripId,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function attachQuickEntrySessionItems(
  db: any,
  sessions: ReturnType<typeof mapQuickEntrySession>[],
  includeItems: boolean
) {
  if (!includeItems || sessions.length === 0) return sessions;

  const sessionIds = sessions.map((session) => session.id);
  const rows = await db.$queryRaw<any[]>`
    SELECT session_id AS "sessionId", parse_status AS "parseStatus"
    FROM quick_trip_entry_items
    WHERE session_id = ANY(${sessionIds}::int[])
  `;
  const itemsBySessionId = new Map<number, { parseStatus: string }[]>();

  for (const row of rows) {
    const items = itemsBySessionId.get(row.sessionId) ?? [];
    items.push({ parseStatus: row.parseStatus });
    itemsBySessionId.set(row.sessionId, items);
  }

  return sessions.map((session) => ({
    ...session,
    items: itemsBySessionId.get(session.id) ?? [],
  }));
}

function toJsonString(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

function createQuickEntrySessionFallbackModel(db: any) {
  return {
    async findMany(args?: any) {
      const where = args?.where ?? {};
      const rows = await db.$queryRaw<any[]>`
        SELECT
          id,
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          account_id AS "accountId",
          created_by_id AS "createdById"
        FROM quick_trip_entry_sessions
        WHERE account_id = ${where.accountId}
          AND (${where.status ?? null}::text IS NULL OR status = ${where.status ?? null})
        ORDER BY updated_at DESC
      `;

      return attachQuickEntrySessionItems(
        db,
        rows.map(mapQuickEntrySession),
        Boolean(args?.include?.items)
      );
    },
    async findFirst(args?: any) {
      const where = args?.where ?? {};
      const rows = await db.$queryRaw<any[]>`
        SELECT
          id,
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          account_id AS "accountId",
          created_by_id AS "createdById"
        FROM quick_trip_entry_sessions
        WHERE account_id = ${where.accountId}
          AND (${where.id ?? null}::int IS NULL OR id = ${where.id ?? null})
          AND (${where.status ?? null}::text IS NULL OR status = ${where.status ?? null})
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      const sessions = await attachQuickEntrySessionItems(
        db,
        rows.map(mapQuickEntrySession),
        Boolean(args?.include?.items)
      );
      return sessions[0] ?? null;
    },
    async create(args: any) {
      const data = args?.data ?? {};
      const rows = await db.$queryRaw<any[]>`
        INSERT INTO quick_trip_entry_sessions (
          name,
          source_type,
          status,
          account_id,
          created_by_id
        )
        VALUES (
          ${data.name},
          ${data.sourceType ?? "conversation"},
          ${data.status ?? "active"},
          ${data.accountId},
          ${data.createdById ?? null}
        )
        RETURNING
          id,
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          account_id AS "accountId",
          created_by_id AS "createdById"
      `;
      const sessions = await attachQuickEntrySessionItems(
        db,
        rows.map(mapQuickEntrySession),
        Boolean(args?.include?.items)
      );
      return sessions[0];
    },
    async update(args: any) {
      const where = args?.where ?? {};
      const data = args?.data ?? {};
      const currentRows = await db.$queryRaw<any[]>`
        SELECT
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt"
        FROM quick_trip_entry_sessions
        WHERE id = ${where.id} AND account_id = ${where.accountId}
        LIMIT 1
      `;
      const current = currentRows[0];
      if (!current) throw new Error("Session not found");

      const rows = await db.$queryRaw<any[]>`
        UPDATE quick_trip_entry_sessions
        SET
          name = ${data.name ?? current.name},
          source_type = ${data.sourceType ?? current.sourceType},
          status = ${data.status ?? current.status},
          last_input_at = ${data.lastInputAt ?? current.lastInputAt},
          updated_at = now()
        WHERE id = ${where.id} AND account_id = ${where.accountId}
        RETURNING
          id,
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          account_id AS "accountId",
          created_by_id AS "createdById"
      `;
      const sessions = await attachQuickEntrySessionItems(
        db,
        rows.map(mapQuickEntrySession),
        Boolean(args?.include?.items)
      );
      return sessions[0];
    },
    async delete(args: any) {
      const where = args?.where ?? {};
      const rows = await db.$queryRaw<any[]>`
        DELETE FROM quick_trip_entry_sessions
        WHERE id = ${where.id} AND account_id = ${where.accountId}
        RETURNING
          id,
          name,
          source_type AS "sourceType",
          status,
          last_input_at AS "lastInputAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          account_id AS "accountId",
          created_by_id AS "createdById"
      `;
      return rows[0] ? mapQuickEntrySession(rows[0]) : null;
    },
  };
}

function createQuickEntryItemFallbackModel(db: any) {
  return {
    async findMany(args?: any) {
      const where = args?.where ?? {};
      const rows = await db.$queryRaw<any[]>`
        SELECT
          id,
          session_id AS "sessionId",
          account_id AS "accountId",
          raw_text AS "rawText",
          source,
          parse_status AS "parseStatus",
          parsed_data AS "parsedData",
          missing_fields AS "missingFields",
          warnings,
          confidence,
          created_trip_id AS "createdTripId",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM quick_trip_entry_items
        WHERE account_id = ${where.accountId}
          AND (${where.sessionId ?? null}::int IS NULL OR session_id = ${where.sessionId ?? null})
        ORDER BY created_at ASC
      `;
      const items = rows.map(mapQuickEntryItem);
      const parseStatus = where.parseStatus;
      if (parseStatus?.in && Array.isArray(parseStatus.in)) {
        return items.filter((item) => parseStatus.in.includes(item.parseStatus));
      }
      if (typeof parseStatus === "string") {
        return items.filter((item) => item.parseStatus === parseStatus);
      }
      return items;
    },
    async findFirst(args?: any) {
      const where = args?.where ?? {};
      const rows = await db.$queryRaw<any[]>`
        SELECT
          id,
          session_id AS "sessionId",
          account_id AS "accountId",
          raw_text AS "rawText",
          source,
          parse_status AS "parseStatus",
          parsed_data AS "parsedData",
          missing_fields AS "missingFields",
          warnings,
          confidence,
          created_trip_id AS "createdTripId",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM quick_trip_entry_items
        WHERE account_id = ${where.accountId}
          AND (${where.id ?? null}::int IS NULL OR id = ${where.id ?? null})
          AND (${where.sessionId ?? null}::int IS NULL OR session_id = ${where.sessionId ?? null})
        ORDER BY created_at ASC
        LIMIT 1
      `;
      return rows[0] ? mapQuickEntryItem(rows[0]) : null;
    },
    async create(args: any) {
      const data = args?.data ?? {};
      const rows = await db.$queryRaw<any[]>`
        INSERT INTO quick_trip_entry_items (
          session_id,
          account_id,
          raw_text,
          source,
          parse_status,
          parsed_data,
          missing_fields,
          warnings,
          confidence
        )
        VALUES (
          ${data.sessionId},
          ${data.accountId},
          ${data.rawText},
          ${data.source ?? "text"},
          ${data.parseStatus ?? "pending"},
          ${toJsonString(data.parsedData)}::jsonb,
          ${toJsonString(data.missingFields)}::jsonb,
          ${toJsonString(data.warnings)}::jsonb,
          ${data.confidence ?? null}
        )
        RETURNING
          id,
          session_id AS "sessionId",
          account_id AS "accountId",
          raw_text AS "rawText",
          source,
          parse_status AS "parseStatus",
          parsed_data AS "parsedData",
          missing_fields AS "missingFields",
          warnings,
          confidence,
          created_trip_id AS "createdTripId",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;
      return mapQuickEntryItem(rows[0]);
    },
    async update(args: any) {
      const where = args?.where ?? {};
      const data = args?.data ?? {};
      const current = await this.findFirst({ where });
      if (!current) throw new Error("Item not found");

      const rows = await db.$queryRaw<any[]>`
        UPDATE quick_trip_entry_items
        SET
          raw_text = ${data.rawText ?? current.rawText},
          parse_status = ${data.parseStatus ?? current.parseStatus},
          parsed_data = ${toJsonString(data.parsedData ?? current.parsedData)}::jsonb,
          missing_fields = ${toJsonString(data.missingFields ?? current.missingFields)}::jsonb,
          warnings = ${toJsonString(data.warnings ?? current.warnings)}::jsonb,
          confidence = ${data.confidence ?? current.confidence},
          created_trip_id = ${data.createdTripId ?? current.createdTripId},
          error_message = ${data.errorMessage ?? current.errorMessage},
          updated_at = now()
        WHERE id = ${where.id} AND account_id = ${where.accountId}
        RETURNING
          id,
          session_id AS "sessionId",
          account_id AS "accountId",
          raw_text AS "rawText",
          source,
          parse_status AS "parseStatus",
          parsed_data AS "parsedData",
          missing_fields AS "missingFields",
          warnings,
          confidence,
          created_trip_id AS "createdTripId",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;
      return mapQuickEntryItem(rows[0]);
    },
    async count(args?: any) {
      const items = await this.findMany({ where: args?.where ?? {} });
      return items.length;
    },
  };
}

function createQuickEntryFallbackModel(modelName: string, db: any) {
  if (modelName === "quickTripEntrySession") {
    return createQuickEntrySessionFallbackModel(db);
  }
  if (modelName === "quickTripEntryItem") {
    return createQuickEntryItemFallbackModel(db);
  }
  return null;
}

function resolveTenantModel(basePrisma: any, modelName: string) {
  try {
    return getPrismaDelegate(basePrisma, undefined, modelName);
  } catch {
    try {
      return getPrismaDelegate(undefined, getCurrentPrismaClient(), modelName);
    } catch (error) {
      const fallbackModel = createQuickEntryFallbackModel(modelName, basePrisma);
      if (fallbackModel) {
        console.warn(
          `Using raw SQL fallback for Prisma delegate ${modelName}; restart the dev server to load the regenerated Prisma Client.`,
        );
        return fallbackModel;
      }

      throw error;
    }
  }
}

function wrapModel(modelName: string, model: any, accountId: number): any {
  return {
    findMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.findMany(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    findFirst(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.findFirst(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    findUnique(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.findFirst(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    create(args: any, ...rest: any[]) {
      return model.create(
        { ...args, data: injectAccountIdToData(args?.data, accountId) },
        ...rest
      );
    },
    createMany(args: any, ...rest: any[]) {
      return model.createMany(
        {
          ...args,
          data: injectAccountIdToCreateManyData(args?.data, accountId),
        },
        ...rest
      );
    },
    update(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.update(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    upsert(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      const upsertWhere = toCompositeUniqueWhere(modelName, where, accountId);
      return model.upsert(
        {
          ...args,
          where: upsertWhere,
          create: injectAccountIdToData(args?.create, accountId),
        },
        ...rest
      );
    },
    delete(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.delete(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    updateMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.updateMany(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    deleteMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.deleteMany(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    count(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.count(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    aggregate(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.aggregate(
        { ...args, where: injectAccountId(where, accountId) },
        ...rest
      );
    },
    findRaw() {
      throw new Error(
        "Raw tenant access is disabled; use parent prisma explicitly with account guard."
      );
    },
    aggregateRaw() {
      throw new Error(
        "Raw tenant access is disabled; use parent prisma explicitly with account guard."
      );
    },
  };
}

export function createTenantPrisma(basePrisma: any, accountId: number): any {
  const nonTenantModels = [
    "account",
    "systemSettings",
    "tripStatus",
    "emailTemplate",
    "pricingFormula",
    "passwordReset",
  ];

  return new Proxy({} as any, {
    get(_target, prop) {
      if (prop === "$parent") return basePrisma;
      if (prop === "$use") return basePrisma.$use.bind(basePrisma);
      if (prop === "$on") return basePrisma.$on.bind(basePrisma);
      if (prop === "$connect") return basePrisma.$connect.bind(basePrisma);
      if (prop === "$disconnect") return basePrisma.$disconnect.bind(basePrisma);

      if (typeof prop === "symbol") return (basePrisma as any)[prop];

      if (nonTenantModels.includes(prop as string)) {
        return (basePrisma as any)[prop];
      }

      if (TENANT_MODELS.has(prop as string)) {
        const modelName = prop as string;
        return wrapModel(modelName, resolveTenantModel(basePrisma, modelName), accountId);
      }

      return (basePrisma as any)[prop];
    },
  });
}
