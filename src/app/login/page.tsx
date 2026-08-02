"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, TextInput } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // Accounts can also log in with a short username instead of the full
    // email — resolve it to the real (auth) email first when needed.
    let email = identifier.trim();
    if (!email.includes("@")) {
      const { data: resolvedEmail } = await supabase.rpc("get_login_email", {
        p_username: email,
      });
      if (resolvedEmail) email = resolvedEmail;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-gold-dark)] flex items-center justify-center font-black text-2xl text-black">
            م
          </span>
          <h1 className="text-xl font-bold text-ink">مكتب مزون الشرق</h1>
          <p className="text-sm text-ink-soft">نظام تحصيل الإيجار الشهري</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="اسم المستخدم أو البريد الإلكتروني">
              <TextInput
                type="text"
                required
                dir="ltr"
                autoCapitalize="off"
                autoCorrect="off"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin"
              />
            </Field>
            <Field label="كلمة المرور">
              <TextInput
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={loading}>
              {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </Button>
            <Link
              href="/forgot-password"
              className="text-sm text-center text-[var(--color-gold-dark)] hover:underline"
            >
              نسيت كلمة المرور؟
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
