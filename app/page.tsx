import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";

export default async function Home() {
  const session = await getSessionFromCookie();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
