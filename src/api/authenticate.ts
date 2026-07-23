import { Request } from "express"
import { cfg } from "../config.js"
import { getBearerToken, validateJWT } from "../auth.js"
import { getUserById } from "../db/queries/users.js"
import { UserNotAuthenticatedError } from "./errors.js"

export async function authenticateUser(req: Request) {
    const token = getBearerToken(req)
    const validSession = validateJWT(token, cfg.api.jwtSecret)

    const user = await getUserById(validSession)

    if (!user) {
        throw new UserNotAuthenticatedError("Invalid or expired token")
    }

    return user.id
}