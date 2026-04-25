import { z } from "zod";

/**
 * Branded type for money values in paisa (cents).
 * Prevents accidental mixing with regular numbers.
 */
export type Paisa = number & { readonly brand: 'Paisa' };

/**
 * Safe constructor for Paisa type.
 * Throws if value is not an integer.
 */
export function toPaisa(value: number): Paisa {
    if (!Number.isInteger(value)) {
        throw new TypeError('Paisa must be an integer value');
    }
    if (value < 0) {
        throw new TypeError('Paisa cannot be negative');
    }
    return value as Paisa;
}

/**
 * Zod schema for validating paisa values.
 */
export const moneyPaisaSchema = z.number().int().nonnegative().transform(toPaisa);

/**
 * Conversion utilities.
 */
export function fromRupeesToPaisa(rupees: number): Paisa {
    return toPaisa(Math.round(rupees * 100));
}

export function toRupees(paisa: Paisa): number {
    return paisa / 100;
}

/**
 * Safe arithmetic operations for Paisa.
 */
export function addPaisa(a: Paisa, b: Paisa): Paisa {
    return toPaisa(a + b);
}

export function subtractPaisa(a: Paisa, b: Paisa): Paisa {
    return toPaisa(a - b);
}

export function multiplyPaisa(a: Paisa, multiplier: number): Paisa {
    return toPaisa(Math.round(a * multiplier));
}

export function dividePaisa(a: Paisa, divisor: number): Paisa {
    if (divisor === 0) {
        throw new TypeError('Cannot divide by zero');
    }
    return toPaisa(Math.round(a / divisor));
}

/**
 * Format paisa as currency string.
 */
export function formatPaisa(paisa: Paisa, currency: string = 'BDT'): string {
    const rupees = toRupees(paisa);
    return `${currency} ${rupees.toFixed(2)}`;
}