/* eslint-disable @typescript-eslint/no-explicit-any */

const TENANT_MODELS = new Set([
  "user",
  "trip",
  "booking",
  "customer",
  "tripCustomer",
  "notification",
  "pushSubscription",
  "userSettings",
]);

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

function wrapModel(model: any, accountId: number): any {
  return {
    findMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.findMany({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    findFirst(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.findFirst({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    findUnique(args: any, ...rest: any[]) {
      return model.findUnique(args, ...rest);
    },
    create(args: any, ...rest: any[]) {
      return model.create({ ...args, data: injectAccountIdToData(args?.data, accountId) }, ...rest);
    },
    update(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.update({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    upsert(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.upsert({
        ...args,
        where: injectAccountId(where, accountId),
        create: injectAccountIdToData(args?.create, accountId),
      }, ...rest);
    },
    delete(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.delete({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    updateMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.updateMany({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    deleteMany(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.deleteMany({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    count(args?: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.count({ ...args, where: injectAccountId(where, accountId) }, ...rest);
    },
    aggregate(args: any, ...rest: any[]) {
      const where = args?.where ?? {};
      return model.aggregate({ ...args, where: injectAccountId(where, accountId) }, ...rest);
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
        return wrapModel((basePrisma as any)[prop], accountId);
      }

      return (basePrisma as any)[prop];
    },
  });
}
