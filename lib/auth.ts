import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface UserPayload {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export async function encrypt(payload: UserPayload): Promise<string> {
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as UserPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return await decrypt(token);
}

export async function getUserFromRequest(request: NextRequest): Promise<UserPayload | null> {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");
  const userName = request.headers.get("x-user-name");

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    id: parseInt(userId, 10),
    email: userEmail,
    role: userRole,
    fullName: userName || "",
  };
}

export async function setSession(user: UserPayload): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  cookieStore.set("session", await encrypt(user), {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function removeSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
