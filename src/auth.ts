import * as argon2 from "argon2"
import { UserNotAuthenticatedError } from "./api/errors.js";

export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password)
}

export async function checkPasswordHash(hash: string, password: string): Promise<boolean> {
    return await argon2.verify(hash, password)
}