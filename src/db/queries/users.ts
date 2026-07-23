import { db } from "../index.js";
import { users, NewUser } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
    const [newUser] = await db
        .insert(users)
        .values(user)
        .returning()

    return newUser
}

export async function getUserById(userId: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        
    return user
}

export async function getUserByEmail(email: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))

    return user
}


// FOR DEVELOPMENT ONLY
export async function deleteAllUsers() {
    await db.delete(users)
}