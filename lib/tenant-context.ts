import { getSessionFromCookie } from "./auth";

export async function getServerTenant(): Promise<number> {
  const session = await getSessionFromCookie();
  if (!session?.accountId) {
    throw new Error("Unauthorized: No account context");
  }
  return session.accountId;
}

export async function requireTenant(): Promise<number> {
  const session = await getSessionFromCookie();
  if (!session?.accountId) {
    throw new Error("Unauthorized: No account context");
  }
  return session.accountId;
}
