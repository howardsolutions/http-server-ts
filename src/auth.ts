import argon2 from "argon2";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";

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

/**
 * Create a JWT token for a user
 * @param userID - The user's ID to include in the token
 * @param expiresIn - Token expiration time in seconds
 * @param secret - Secret key to sign the token
 * @returns string - The signed JWT token
 */
export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload: Pick<JwtPayload, "iss" | "sub" | "iat" | "exp"> = {
    iss: "chirpy",
    sub: userID,
    iat: now,
    exp: now + expiresIn
  };

  return jwt.sign(payload, secret);
}

/**
 * Extract bearer token from Authorization header
 * @param req - Express request object
 * @returns string - The token string without "Bearer " prefix
 * @throws Error if Authorization header is missing or malformed
 */
export function getBearerToken(req: any): string {
  const authHeader = req.get("Authorization");
  
  if (!authHeader || authHeader.trim() === "") {
    throw new Error("Authorization header is missing");
  }
  
  const trimmedHeader = authHeader.trim();
  
  if (!trimmedHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header must start with 'Bearer '");
  }
  
  return trimmedHeader.substring(7).trim();
}

/**
 * Validate a JWT token and extract the user ID
 * @param tokenString - The JWT token string to validate
 * @param secret - Secret key to verify the token signature
 * @returns string - The user ID from the token's subject field
 * @throws Error if token is invalid, expired, or has wrong signature
 */
export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decoded = jwt.verify(tokenString, secret) as JwtPayload;
    
    if (!decoded.sub) {
      throw new Error("Token does not contain a subject");
    }
    
    return decoded.sub;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error("Token not active yet");
    }
    throw error;
  }
}

/**
 * Create a random 256-bit (32 byte) refresh token encoded as hex
 */
export function makeRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
