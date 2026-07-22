import { Request, Response } from "express";
import { cfg } from "../config.js";
import { PublicUser } from "../db/schema.js";
import { verifyPassword, makeJWT } from "../auth.js";
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

    const validatedUser: PublicUser = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email,
        profileImg: user.profileImg,
        username: user.username
    }

    res.status(200).json({ validatedUser, token: accessToken })
}