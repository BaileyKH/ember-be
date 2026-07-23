import { Request } from "express";
import * as argon2 from "argon2"
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { UserNotAuthenticatedError } from "./api/errors.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;
export const ACCESS_TOKEN_ISSUER = "ember-access";

export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    if (!password) return false; 

    try {

        return await argon2.verify(hash, password)

    } catch {

        return false;
    }
}

export function makeJWT(userId: string, expiresIn: number, secret: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiredAt = issuedAt + expiresIn;
    const token = jwt.sign(
        {
            iss: ACCESS_TOKEN_ISSUER,
            sub: userId,
            iat: issuedAt,
            exp: expiredAt
        } satisfies payload,
        secret,
        { algorithm: "HS256" }
    )

    return token;
}

export function validateJWT(token: string, secret: string): string {
    const decodedJWT = jwt.verify(token, secret) as jwt.JwtPayload;

    if (decodedJWT.iss !== ACCESS_TOKEN_ISSUER) {
        throw new UserNotAuthenticatedError("Invalid Issuer");
    }

    const userId = decodedJWT.sub;

    if (!userId) {
        throw new UserNotAuthenticatedError("Missing User");
    }

    return userId;
}

export function getBearerToken(req: Request): string {
    const authRes = req.get("Authorization")

    if (!authRes || typeof authRes !== "string" || authRes.length < 1) {
        throw new UserNotAuthenticatedError("Missing or invalid authorization")
    }

    const authString = authRes.split(" ")
    if (authString.length !== 2 || authString[0].toLowerCase() !== "bearer" || !authString[1]) {
        throw new UserNotAuthenticatedError("Missing or invalid authorization")
    }

    return authString[1]
}

export function makeRefreshToken() {
    const refreshToken = crypto.randomBytes(32).toString("hex")

    return refreshToken
}