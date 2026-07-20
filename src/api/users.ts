import { Request, Response } from "express";
import { ExistingUser } from "../db/schema.js";
import { createUser } from "../db/queries/users.js";
import { hashPassword } from "../auth.js";
import { BadRequestError, getDBViolation } from "./errors.js";

type PublicUser = Omit<ExistingUser, "hashedPassword">

export async function createUserHandler(req: Request, res: Response) {
    const { email, username, password } = req.body

    if (typeof email !== "string" || email.length === 0) {
        throw new BadRequestError("Please provide a valid, email, username, and password")
    }

    if (typeof username !== "string" || username.length === 0) {
        throw new BadRequestError("Please provide a valid, email, username, and password")
    }

    if (!password || password.length === 0) {
        throw new BadRequestError("Please provide a valid password")
    }

    if (password.length < 8) {
        throw new BadRequestError("Password must be at least 8 characters in length")
    }

    const validEmail = email.toLowerCase().trim()
    const validUsername = username.trim()

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(validUsername)) {
        throw new BadRequestError("Username must be 3-30 characters")
    }

    const hashedPassword = await hashPassword(password)

    try {
        const newUser = await createUser({ email: validEmail, username: validUsername, hashedPassword })

        const publicUser: PublicUser = {
            id: newUser.id,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            email: newUser.email,
            profileImg: newUser.profileImg,
            username: newUser.username
        }

        return res.status(201).json(publicUser)

    } catch(err: any) {

        const constraint = getDBViolation(err);

        if (constraint === null) {
            throw err
        }

        if (constraint === "users_email_unique") {
            throw new BadRequestError("Email already in use")
        }

        if (constraint === "users_username_lower_unique") {
            throw new BadRequestError("Username already taken")
        }

        throw new BadRequestError("Email or username already in use")
    }
}