import argon2 from "argon2";

/**
 * Hash a password using argon2
 * @param password - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

/**
 * Check if a password matches a stored hash
 * @param password - The plain text password to verify
 * @param hash - The stored hash to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // If verification fails for any reason, return false
    return false;
  }
}
