"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

const ADMIN_LINKS = [
  { href: "/tenants", label: "بيان المستأجرين" },
  { href: "/tenants/new", label: "إضافة مستأجر" },
  { href: "/tenants/import", label: "استيراد Excel" },
  { href: "/unpaid", label: "غير المسددين" },
  { href: "/info", label: "المعلومات" },
];

const VIEWER_LINKS = [{ href: "/info", label: "المعلومات" }];

export function NavShell({
  role,
  fullName,
  children,
}: {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = role === "admin" ? ADMIN_LINKS : VIEWER_LINKS;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 bg-black text-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-none w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-gold-light)] to-[var(--color-gold-dark)] flex items-center justify-center font-black text-black">
              م
            </span>
            <span className="font-bold text-[var(--color-gold-light)] text-base sm:text-lg truncate">
              مكتب مزون الشرق
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-[var(--color-gold)] text-black"
                    : "text-gray-200 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-white/10"
            >
              تسجيل خروج
            </button>
          </nav>

          <button
            aria-label="القائمة"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex-none w-9 h-9 flex items-center justify-center rounded-lg border border-white/20 text-white"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>

        {open && (
          <nav className="md:hidden border-t border-white/10 px-4 py-2 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-3 rounded-lg text-sm font-medium ${
                  pathname === l.href
                    ? "bg-[var(--color-gold)] text-black"
                    : "text-gray-200 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="px-3 py-3 text-right rounded-lg text-sm font-medium text-gray-200 hover:bg-white/10"
            >
              تسجيل خروج ({fullName})
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 sm:py-8">{children}</main>

      <footer className="text-center text-xs text-ink-soft py-4">
        مكتب مزون الشرق — نظام تحصيل الإيجار
      </footer>
    </div>
  );
}
