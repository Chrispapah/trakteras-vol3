import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a DB timestamp (e.g. "2026-03-10 11:00:00+00") without timezone conversion.
 * Strips the UTC offset so the stored time is shown exactly as entered, regardless
 * of the browser's local timezone.
 */
export function parseDbDate(dateStr: string): Date {
  const match = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/
  );

  if (!match) {
    return new Date(dateStr);
  }

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

/**
 * Convert a DB timestamp to a value suitable for a <input type="datetime-local">.
 * Returns "YYYY-MM-DDTHH:MM" in the same nominal time as stored in the DB.
 */
export function dbDateToInputValue(dateStr: string): string {
  const d = parseDbDate(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a datetime-local input value ("YYYY-MM-DDTHH:MM") to a UTC ISO string
 * by treating the entered time as UTC, so it round-trips with parseDbDate.
 */
export function inputValueToDbDate(inputValue: string): string {
  return inputValue.replace('T', ' ') + ':00+00';
}

export function parseNumericAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function formatCurrencyAmount(amount: number, locale = 'el-GR', currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
