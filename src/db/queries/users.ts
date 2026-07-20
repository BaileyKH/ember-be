import { db } from "../index.js";
import { users, NewUser } from "../schema.js";

export async function createUser(user: NewUser) {
    const [newUser] = await db
        .insert(users)
        .values(user)
        .returning()

    return newUser
}