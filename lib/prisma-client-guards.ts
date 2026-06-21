const REQUIRED_PRISMA_DELEGATES = [
  "quickTripEntrySession",
  "quickTripEntryItem",
] as const;

type PrismaLike = Record<string, unknown>;

export function getMissingPrismaDelegates(client: unknown) {
  if (!client || typeof client !== "object") {
    return [...REQUIRED_PRISMA_DELEGATES];
  }

  const prismaLike = client as PrismaLike;
  return REQUIRED_PRISMA_DELEGATES.filter(
    (delegate) => prismaLike[delegate] === undefined,
  );
}

export function hasRequiredPrismaDelegates(client: unknown) {
  return getMissingPrismaDelegates(client).length === 0;
}

export function getPrismaDelegate(
  preferredClient: unknown,
  fallbackClient: unknown,
  delegate: string,
) {
  const preferredDelegate =
    preferredClient && typeof preferredClient === "object"
      ? (preferredClient as PrismaLike)[delegate]
      : undefined;

  if (preferredDelegate !== undefined) {
    return preferredDelegate;
  }

  const fallbackDelegate =
    fallbackClient && typeof fallbackClient === "object"
      ? (fallbackClient as PrismaLike)[delegate]
      : undefined;

  if (fallbackDelegate !== undefined) {
    return fallbackDelegate;
  }

  throw new Error(
    `Prisma delegate ${delegate} is not available. Regenerate Prisma Client and restart the dev server.`,
  );
}
