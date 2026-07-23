import { Request, Response } from "express";
import { cfg } from "../config.js";
import { PublicUser } from "../db/schema.js";
import { verifyPassword, makeJWT, makeRefreshToken, getBearerToken } from "../auth.js";
import { createRefreshToken, getUserByRefreshToken, revokeRefreshToken } from "../db/queries/tokenRefresh.js";
import { getUserByEmail } from "../db/queries/users.js";
import { BadRequestError, UserNotAuthenticatedError } from "./errors.js";

export async function loginHandler(req: Request, res: Response) {
    const { email, password } = req.body

    if (!email || typeof email !== "string" || email.length === 0) {
        throw new BadRequestError("Email and Password are required")
    }

    if (!password || typeof password !== "string" || password.length === 0) {
        throw new BadRequestError("Email and Password are required")
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await getUserByEmail(normalizedEmail)

    if (!user) {
        throw new UserNotAuthenticatedError("Incorrect email or password")
    }

    const checkedPassword = await verifyPassword(user.hashedPassword, password)

    if (!checkedPassword) {
        throw new UserNotAuthenticatedError("Incorrect email or password")
    }

    const accessToken = makeJWT(user.id, cfg.db.defaultDuration, cfg.api.jwtSecret)
    const refreshToken = makeRefreshToken()

    const savedToken = await createRefreshToken(refreshToken, user.id)

    if (!savedToken) {
        throw new Error("Failed to create refresh token");
    }

    const validatedUser: PublicUser = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email,
        profileImg: user.profileImg,
        username: user.username
    }

    res.status(200).json({ validatedUser, token: accessToken, refreshToken })
}

export async function refreshHandler(req: Request, res: Response) {
    const refreshToken = getBearerToken(req)
    const user = await getUserByRefreshToken(refreshToken)

    if (!user) {
        throw new UserNotAuthenticatedError("Invalid or expired refresh token")
    }

    const accessToken = makeJWT(user.id, cfg.db.defaultDuration, cfg.api.jwtSecret)

    return res.status(200).json({ token: accessToken })
}

export async function revokeHandler(req: Request, res: Response) {
    const token = getBearerToken(req)
    await revokeRefreshToken(token)

    res.status(204).send()
}