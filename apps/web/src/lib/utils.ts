import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names safely using clsx and tailwind-merge.
 *
 * @param inputs - List of class names, conditional expressions, or arrays of class values.
 * @returns The resolved merged class names string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
