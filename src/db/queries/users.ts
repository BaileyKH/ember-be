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

export async function updateUserProfileImg(userId: string, imgPath: string) {
    return db.transaction(async (tx) => {
        const [existingUser] = await tx
            .select({ profileImg: users.profileImg })
            .from(users)
            .where(eq(users.id, userId))
            .for("update")

        if (!existingUser) return undefined

        const [updatedUser] = await tx
            .update(users)
            .set({ profileImg: imgPath })
            .where(eq(users.id, userId))
            .returning({profileImg: users.profileImg})

        if (!updatedUser) return undefined

        return { profileImg: updatedUser.profileImg, previousPath: existingUser.profileImg }
    })
}


// FOR DEVELOPMENT ONLY
export async function deleteAllUsers() {
    await db.delete(users)
}