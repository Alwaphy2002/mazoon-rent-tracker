"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, TextInput } from "@/components/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("انتهت صلاحية الرابط أو حدث خطأ، أعد طلب رابط جديد");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-ink mb-6 text-center">تعيين كلمة مرور جديدة</h1>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="كلمة المرور الجديدة">
              <TextInput
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="تأكيد كلمة المرور">
              <TextInput
                type="password"
                required
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={loading}>
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
