import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, type UserPayload } from "./jwt";

export { encrypt, decrypt, type UserPayload };

// Server Component version - just validates token without deleting cookies
export async function getSessionFromCookie(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = await decrypt(token);
  if (!payload) return null;

  // Skip passwordVersion check in Server Components to avoid cookie deletion issues
  // The check will be done in Route Handlers instead
  return payload;
}

// Route Handler version - can delete cookies if needed
export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = await decrypt(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { passwordVersion: true },
    });

    if (!user || user.passwordVersion !== payload.passwordVersion) {
      // Password đã thay đổi, xóa session
      cookieStore.delete("session");
      return null;
    }
  } catch (error) {
    console.error("Error checking password version:", error);
  }

  return payload;
}

export async function getUserFromRequest(request: NextRequest): Promise<UserPayload | null> {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");
  const userName = request.headers.get("x-user-name");
  const userPasswordVersion = request.headers.get("x-user-password-version");

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    id: parseInt(userId, 10),
    email: userEmail,
    role: userRole,
    fullName: userName || "",
    passwordVersion: userPasswordVersion ? parseInt(userPasswordVersion, 10) : 1,
  };
}

export async function setSession(user: UserPayload): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const h = await headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https";

  cookieStore.set("session", await encrypt(user), {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? isHttps : false,
    sameSite: "lax",
    path: "/",
  });
}

export async function removeSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
