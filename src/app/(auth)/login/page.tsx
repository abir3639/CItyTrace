import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · CityTrace",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const currentUser = await getCurrentUser();

  return <AuthForm mode="login" initialNext={next} currentUser={currentUser} />;
}
