import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const DATE_KEY = "YYYY-MM-DD";
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** Local calendar day, never UTC ISO prefix. */
export function localDateKey(value: Dayjs): string {
  return `${value.year()}-${pad2(value.month() + 1)}-${pad2(value.date())}`;
}

export function todayDateKey(): string {
  return localDateKey(dayjs());
}

export function toDateKey(value: unknown): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    if (DATE_KEY_RE.test(value)) {
      const parsed = dayjs(value, DATE_KEY, true);
      return parsed.isValid() ? value : undefined;
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? localDateKey(parsed) : undefined;
  }

  if (dayjs.isDayjs(value) && value.isValid()) {
    return localDateKey(value);
  }

  return undefined;
}

export function dateKeyToDayjs(value: string | undefined): Dayjs | undefined {
  if (!value || !DATE_KEY_RE.test(value)) {
    return undefined;
  }
  const parsed = dayjs(value, DATE_KEY, true);
  return parsed.isValid() ? parsed : undefined;
}

export function datePickerValueFromEvent(
  ...args: unknown[]
): string | undefined {
  const dateString = args[1];
  if (typeof dateString === "string" && DATE_KEY_RE.test(dateString)) {
    return dateString;
  }
  if (Array.isArray(dateString) && typeof dateString[0] === "string") {
    return toDateKey(dateString[0]);
  }
  return toDateKey(args[0]);
}
