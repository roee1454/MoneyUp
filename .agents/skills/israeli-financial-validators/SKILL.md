---
name: israeli-financial-validators
description: Contains guidelines and reference algorithms for validating Israeli financial structures (e.g. Tz check-digit validation, Bank codes, Account number conventions).
---

# Israeli Financial Validators & Logic Guide

This skill provides reference logic and algorithms to check the validity of Israeli identification numbers and banking coordinates.

---

## 1. Israeli ID Check-Digit Algorithm (תעודת זהות)

An Israeli ID consists of 9 digits (8 base digits + 1 check digit). If the length is less than 9, it must be padded with leading zeros.

### Validation Algorithm
To check if an ID string `tz` is valid:
1. Parse the string into digits. Pad with leading zeros if length is < 9.
2. Multiply each digit by a weight alternating between `1` and `2`:
   - Digits at indices `0, 2, 4, 6, 8` multiplied by `1`.
   - Digits at indices `1, 3, 5, 7` multiplied by `2`.
3. For each product:
   - If the product is `> 9`, sum the digits of the product (e.g. `12` becomes `1 + 2 = 3`).
4. Sum all the resulting values.
5. The ID is valid if the total sum is divisible by `10` (i.e. `sum % 10 === 0`).

### TypeScript Code Implementation
```typescript
export function validateIsraeliId(id: string): boolean {
  const cleanId = id.trim().padStart(9, '0');
  if (cleanId.length !== 9 || isNaN(Number(cleanId))) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = Number(cleanId.charAt(i));
    const step = digit * ((i % 2) + 1);
    sum += step > 9 ? (step - 9) : step; // Subtracting 9 is equivalent to summing digits for values 10-18
  }
  return sum % 10 === 0;
}
```

---

## 2. Bank Identification Codes (קודי בנקים בישראל)
When mapping bank branches or normalizing sync targets, use the standard Bank Clearing House codes:
- **`12`**: Bank Hapoalim (בנק הפועלים)
- **`10`**: Bank Leumi (בנק לאומי)
- **`11`**: Israel Discount Bank (בנק דיסקונט)
- **`20`**: Mizrahi Tefahot Bank (בנק מזרחי טפחות)
- **`31`**: First International Bank of Israel (הבנק הבינלאומי)
- **`14`**: Otsar Ha-Hayal (אוצר החייל - brand of International)
- **`46`**: Bank Massad (בנק מסד)
- **`09`**: Israel Post Bank (בנק הדואר)
- **`26`**: U-Bank (יובנק)
- **`68`**: Dexia Israel (דקסיה)
- **`04`**: Bank Yahav (בנק יהב)
