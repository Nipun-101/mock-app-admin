/**
 * API stores and returns money as integer paise.
 * Admin UI displays and accepts rupees (2 decimal places).
 */

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("Amount must be a finite number");
  }
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) {
    throw new Error("Amount must be a finite number");
  }
  return paise / 100;
}

export function formatPaiseAsRupees(paise: number): string {
  const rupees = paiseToRupees(paise);
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
