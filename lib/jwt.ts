import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface UserPayload {
  id: number;
  email: string;
  fullName: string;
  role: string;
  passwordVersion: number;
  accountId: number;
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
    return {
      id: payload.id as number,
      email: payload.email as string,
      fullName: (payload.fullName as string) || "",
      role: payload.role as string,
      passwordVersion: payload.passwordVersion as number,
      accountId: (payload.accountId as number) || 0,
    };
  } catch {
    return null;
  }
}
