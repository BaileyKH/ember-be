import { describe, it, expect } from "vitest";
import { makeJWT, validateJWT, getBearerToken } from "./auth.js";
import { Request } from 'express'

describe("Validating JWTs", () => {
    const userID = "user123";
    const secret = "my-secret";
    const expiresIn = 60;

    it("should create a valid JWT token", () => {
        const result = makeJWT(userID, expiresIn, secret)
        const validatedJWT = validateJWT(result, secret)
        expect(validatedJWT).toBe(userID)
    })

    it("should throw an error for expired token", () => {
        const expired = -1
        const result = makeJWT(userID, expired, secret)

        expect(() => validateJWT(result, secret)).toThrow()
    })

    it("should throw an error for incorrect secret", () => {
        const wrongSecret = "not-my-secret"
        const result = makeJWT(userID, expiresIn, secret)

        expect(() => validateJWT(result, wrongSecret)).toThrow()
    })
})

describe("Validating Auth Header", () => {

    function getMockRequest(headers: Record<string, string>) {
        return {
            get: (key: string) => headers[key],
        };
    }

    it("should return a valid token", () => {
        const validToken = "Bearer 1234567890"
        const req = getMockRequest({ "Authorization": validToken }) as unknown as Request;
        const result = getBearerToken(req)

        expect(result).toBe("1234567890")
    })

    it("should throw an error for incorrect auth", () => {
        const invalidToken = "1234567890"
        const req = getMockRequest({ "Authorization": invalidToken }) as unknown as Request;

        expect(() => getBearerToken(req)).toThrow()
    })

    it("should throw an error for missing auth", () => {
        const req = getMockRequest({}) as unknown as Request;

        expect(() => getBearerToken(req)).toThrow()
    })
})