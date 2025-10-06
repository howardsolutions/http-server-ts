import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT, hashPassword, checkPasswordHash, getBearerToken } from "./auth";
describe("Password Hashing", () => {
    const password1 = "correctPassword123!";
    const password2 = "anotherPassword456!";
    let hash1;
    let hash2;
    beforeAll(async () => {
        hash1 = await hashPassword(password1);
        hash2 = await hashPassword(password2);
    });
    it("should return true for the correct password", async () => {
        const result = await checkPasswordHash(password1, hash1);
        expect(result).toBe(true);
    });
    it("should return false for the wrong password", async () => {
        const result = await checkPasswordHash(password2, hash1);
        expect(result).toBe(false);
    });
    it("should return false for invalid hash", async () => {
        const result = await checkPasswordHash(password1, "invalid-hash");
        expect(result).toBe(false);
    });
    it("should generate different hashes for the same password", () => {
        expect(hash1).not.toBe(hash2);
    });
});
describe("JWT Creation and Validation", () => {
    const testSecret = "test-secret-key";
    const testUserID = "user123";
    const expiresIn = 3600; // 1 hour
    it("should create a valid JWT token", () => {
        const token = makeJWT(testUserID, expiresIn, testSecret);
        expect(token).toBeDefined();
        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3); // JWT has 3 parts separated by dots
    });
    it("should validate a correctly signed JWT token", () => {
        const token = makeJWT(testUserID, expiresIn, testSecret);
        const decodedUserID = validateJWT(token, testSecret);
        expect(decodedUserID).toBe(testUserID);
    });
    it("should reject JWT signed with wrong secret", () => {
        const token = makeJWT(testUserID, expiresIn, testSecret);
        const wrongSecret = "wrong-secret-key";
        expect(() => {
            validateJWT(token, wrongSecret);
        }).toThrow("Invalid token");
    });
    it("should reject expired JWT token", () => {
        // Create a token that expires immediately (0 seconds)
        const token = makeJWT(testUserID, 0, testSecret);
        // Wait a moment to ensure the token is expired
        setTimeout(() => {
            expect(() => {
                validateJWT(token, testSecret);
            }).toThrow("Token has expired");
        }, 1000);
    });
    it("should reject invalid JWT token format", () => {
        const invalidToken = "not.a.valid.jwt.token";
        expect(() => {
            validateJWT(invalidToken, testSecret);
        }).toThrow("Invalid token");
    });
    it("should reject malformed JWT token", () => {
        const malformedToken = "invalid-token-format";
        expect(() => {
            validateJWT(malformedToken, testSecret);
        }).toThrow("Invalid token");
    });
    it("should include correct payload fields in JWT", () => {
        const token = makeJWT(testUserID, expiresIn, testSecret);
        const parts = token.split(".");
        // Decode the payload (second part of JWT)
        const payload = JSON.parse(atob(parts[1]));
        expect(payload.iss).toBe("chirpy");
        expect(payload.sub).toBe(testUserID);
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect(payload.exp).toBe(payload.iat + expiresIn);
    });
    it("should handle different user IDs correctly", () => {
        const userID1 = "user123";
        const userID2 = "user456";
        const token1 = makeJWT(userID1, expiresIn, testSecret);
        const token2 = makeJWT(userID2, expiresIn, testSecret);
        const decoded1 = validateJWT(token1, testSecret);
        const decoded2 = validateJWT(token2, testSecret);
        expect(decoded1).toBe(userID1);
        expect(decoded2).toBe(userID2);
        expect(decoded1).not.toBe(decoded2);
    });
    it("should handle different expiration times correctly", () => {
        const shortExpiry = 60; // 1 minute
        const longExpiry = 86400; // 1 day
        const shortToken = makeJWT(testUserID, shortExpiry, testSecret);
        const longToken = makeJWT(testUserID, longExpiry, testSecret);
        const shortParts = shortToken.split(".");
        const longParts = longToken.split(".");
        const shortPayload = JSON.parse(atob(shortParts[1]));
        const longPayload = JSON.parse(atob(longParts[1]));
        expect(shortPayload.exp - shortPayload.iat).toBe(shortExpiry);
        expect(longPayload.exp - longPayload.iat).toBe(longExpiry);
        expect(longPayload.exp).toBeGreaterThan(shortPayload.exp);
    });
});
describe("Bearer Token Extraction", () => {
    it("should extract token from valid Authorization header", () => {
        const mockReq = {
            get: (header) => {
                if (header === "Authorization") {
                    return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpXVCJ9";
                }
                return undefined;
            }
        };
        const token = getBearerToken(mockReq);
        expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpXVCJ9");
    });
    it("should handle Authorization header with extra whitespace", () => {
        const mockReq = {
            get: (header) => {
                if (header === "Authorization") {
                    return "  Bearer   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpXVCJ9  ";
                }
                return undefined;
            }
        };
        const token = getBearerToken(mockReq);
        expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpXVCJ9");
    });
    it("should throw error when Authorization header is missing", () => {
        const mockReq = {
            get: (header) => {
                return undefined;
            }
        };
        expect(() => {
            getBearerToken(mockReq);
        }).toThrow("Authorization header is missing");
    });
    it("should throw error when Authorization header does not start with Bearer", () => {
        const mockReq = {
            get: (header) => {
                if (header === "Authorization") {
                    return "Basic dXNlcjpwYXNzd29yZA==";
                }
                return undefined;
            }
        };
        expect(() => {
            getBearerToken(mockReq);
        }).toThrow("Authorization header must start with 'Bearer '");
    });
    it("should throw error when Authorization header is empty", () => {
        const mockReq = {
            get: (header) => {
                if (header === "Authorization") {
                    return "";
                }
                return undefined;
            }
        };
        expect(() => {
            getBearerToken(mockReq);
        }).toThrow("Authorization header is missing");
    });
    it("should throw error when Authorization header is just 'Bearer'", () => {
        const mockReq = {
            get: (header) => {
                if (header === "Authorization") {
                    return "Bearer";
                }
                return undefined;
            }
        };
        expect(() => {
            getBearerToken(mockReq);
        }).toThrow("Authorization header must start with 'Bearer '");
    });
});
