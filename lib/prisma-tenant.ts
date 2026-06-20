/* eslint-disable @typescript-eslint/no-explicit-any */

const TENANT_MODELS = new Set([
  "user",
  "trip",
  "tripEvent",
  "booking",
  "customer",
  "tripCustomer",
  "notification",
  "pushSubscription",
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
    endpoint: "push_subscriptions_account_id_endpoint_key",
  },
  userSettings: {
    userId: "user_settings_account_id_user_id_key",
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
      return model.findUnique(args, ...rest);
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
    findRaw(args?: any, ...rest: any[]) {
      return model.findRaw(args, ...rest);
    },
    aggregateRaw(args?: any, ...rest: any[]) {
      return model.aggregateRaw(args, ...rest);
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
        return wrapModel(
          prop as string,
          (basePrisma as any)[prop],
          accountId
        );
      }

      return (basePrisma as any)[prop];
    },
  });
}
