/**
 * Normalizes credentials format based on specific bank requirements.
 *
 * @param bankId Target bank/card provider ID
 * @param credentials User inputted credentials dictionary
 * @returns Normalized credentials dictionary
 */
export function normalizeCredentials(
  bankId: string,
  credentials: Record<string, string>,
): Record<string, string> {
  if (
    bankId === 'hapoalim' &&
    credentials.username &&
    !credentials.userCode
  ) {
    return {
      ...credentials,
      userCode: credentials.username,
    };
  }

  if (
    (bankId === 'leumi' || bankId === 'yahav') &&
    credentials.id &&
    !credentials.nationalID
  ) {
    return {
      ...credentials,
      nationalID: credentials.id,
    };
  }

  return credentials;
}

/**
 * Validates whether all mandatory fields for the specified bank are provided.
 *
 * @param bankId Target bank/card provider ID
 * @param credentials Credentials dictionary
 * @returns Validation error message string, or null if valid
 */
export function validateCredentials(
  bankId: string,
  credentials: Record<string, string>,
): string | null {
  const isMissing = (value: string | undefined) =>
    !value || value.trim().length === 0;

  if (bankId === 'hapoalim') {
    if (isMissing(credentials.userCode) || isMissing(credentials.password)) {
      return "Missing required hapoalim credentials. Expected 'userCode' and 'password'.";
    }
  }

  if (bankId === 'leumi') {
    if (isMissing(credentials.username) || isMissing(credentials.password)) {
      return "Missing required leumi credentials. Expected 'username' and 'password'.";
    }
  }

  if (bankId === 'yahav') {
    if (
      isMissing(credentials.username) ||
      isMissing(credentials.password) ||
      (isMissing(credentials.nationalID) && isMissing(credentials.id))
    ) {
      return "Missing required yahav credentials. Expected 'username', 'password', and 'nationalID'.";
    }
  }

  if (bankId === 'max') {
    if (isMissing(credentials.username) || isMissing(credentials.password)) {
      return "Missing required max credentials. Expected 'username' and 'password'.";
    }
  }

  if (bankId === 'cal') {
    if (isMissing(credentials.username) || isMissing(credentials.password)) {
      return "Missing required cal credentials. Expected 'username' and 'password'.";
    }
  }

  if (bankId === 'isracard') {
    if (
      isMissing(credentials.id) ||
      isMissing(credentials.card6Digits) ||
      isMissing(credentials.password)
    ) {
      return "Missing required isracard credentials. Expected 'id', 'card6Digits', and 'password'.";
    }
  }

  return null;
}
