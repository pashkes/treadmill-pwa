import { Temporal } from '@js-temporal/polyfill';

export type LocalDateString = `${number}-${number}-${number}`;

export function todayPlainDate(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

export function toPlainDate(date: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(date);
}

export function todayString(): string {
  return todayPlainDate().toString();
}

export function nowTimeString(): string {
  const now = Temporal.Now.plainTimeISO();
  return `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat('ru', { month: 'long' }).format(date);
  return `${year} · ${monthName[0].toUpperCase()}${monthName.slice(1)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('ru', { maximumFractionDigits }).format(value);
}
