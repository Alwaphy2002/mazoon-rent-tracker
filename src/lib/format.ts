export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Normalizes Saudi numbers (05XXXXXXXX or +9665XXXXXXXX) into the
// international format wa.me needs, with no leading zero or plus.
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return "966" + digits.slice(1);
  if (digits.startsWith("5")) return "966" + digits;
  return digits;
}

export function buildWhatsAppReminderLink(
  phone: string,
  tenantName: string,
  monthLabel: string,
  amount: number
): string {
  const message =
    `مرحبًا ${tenantName}،\n` +
    `نود تذكيركم بأن إيجار شهر ${monthLabel} المستحق قدره ${formatSAR(amount)} لم يتم تسديده بعد.\n` +
    `يرجى التكرم بالسداد في أقرب وقت ممكن.\n` +
    `مكتب مزون الشرق`;
  const wa = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}
