import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  // Already signed in — there is nothing to do on this page.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/account");

  return (
    <div className="shell flex min-h-[85vh] items-center py-40">
      <AuthForm mode="sign-in" />
    </div>
  );
}
