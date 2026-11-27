import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account · CityTrace",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const currentUser = await getCurrentUser();

  return <AuthForm mode="register" initialNext={next} currentUser={currentUser} />;
}
