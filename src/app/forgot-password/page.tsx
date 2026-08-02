"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, TextInput } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("تعذر إرسال رابط الاستعادة، حاول مرة أخرى");
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-ink mb-6 text-center">استعادة كلمة المرور</h1>
        <Card>
          {sent ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-ink">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تفقّد صندوق الوارد
                (أو الرسائل غير المرغوبة).
              </p>
              <Link href="/login" className="text-sm text-[var(--color-gold-dark)] hover:underline">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="البريد الإلكتروني">
                <TextInput
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={loading}>
                {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </Button>
              <Link
                href="/login"
                className="text-sm text-center text-ink-soft hover:underline"
              >
                العودة لتسجيل الدخول
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
