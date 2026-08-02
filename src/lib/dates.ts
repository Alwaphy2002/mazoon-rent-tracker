// All month/date logic for the rent-collection cycle.
// Rule: a tenant becomes "unpaid" the moment a new Gregorian month starts
// (day 1) unless that month has already been marked paid.

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const names = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  return `${names[m - 1]} ${y}`;
}

export function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d;
}

export function contractEndDate(startDate: string, durationMonths: number): Date {
  return addMonths(startDate, durationMonths);
}

// The list of every calendar month a contract spans, from its start month
// through to (but excluding) its end month.
export function contractMonthKeys(startDate: string, durationMonths: number): string[] {
  const start = new Date(startDate + "T00:00:00");
  const keys: string[] = [];
  for (let i = 0; i < durationMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    keys.push(toMonthKey(d));
  }
  return keys;
}

// First day of the next calendar month after today — the "next due date".
export function nextDueDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toISOString().slice(0, 10);
}
