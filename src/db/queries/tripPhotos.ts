import { db } from "../index.js";
import { tripPhotos, trips, users, tripMembers } from "../schema.js";
import { eq, and, or, desc, lt } from "drizzle-orm";

export type NewTripPhotoData = {
    id: string,
    imagePath: string,
    thumbnailPath: string,
    width: number,
    height: number,
}

export type PhotoCursor = {
    createdAt: Date,
    id: string
}

export async function addTripPhoto(tripId: string, userId: string, photo: NewTripPhotoData) {
    return db.transaction(async (tx) => {
        const [membership] = await tx
            .select({id: tripMembers.id})
            .from(tripMembers)
            .where(and(
                eq(tripMembers.tripId, tripId),
                eq(tripMembers.userId, userId)
            ))
            .for("update")

        if (!membership) return undefined

        const [newPhoto] = await tx
            .insert(tripPhotos)
            .values({
                id: photo.id,
                tripId,
                uploadedById: userId,
                imagePath: photo.imagePath,
                thumbnailPath: photo.thumbnailPath,
                width: photo.width,
                height: photo.height
            })
            .returning()

        if (!newPhoto) {
            throw new Error("Failed to save trip photo")
        }

        return newPhoto
    })
}

export async function getTripPhotos(tripId: string, userId: string, photoLimit: number, cursor?: PhotoCursor) {
    const limit = Math.min(Math.max(photoLimit, 1), 50)

    return db.transaction(async (tx) => {
        const [membership] = await tx
            .select({id: tripMembers.id})
            .from(tripMembers)
            .where(and(
                eq(tripMembers.tripId, tripId),
                eq(tripMembers.userId, userId)
            ))
            

        if (!membership) return undefined

        const cursorCondition = cursor ? or(lt(tripPhotos.createdAt,cursor.createdAt), and(eq(tripPhotos.createdAt, cursor.createdAt), lt(tripPhotos.id, cursor.id))) : undefined

        const rows = await tx
            .select({
                id: tripPhotos.id,
                createdAt: tripPhotos.createdAt,
                tripId: tripPhotos.tripId,
                uploadedById: tripPhotos.uploadedById,
                thumbnailPath: tripPhotos.thumbnailPath,
                width: tripPhotos.width,
                height: tripPhotos.height,
                uploader: {
                    id: users.id,
                    username: users.username,
                    profileImg: users.profileImg
                }
            })
            .from(tripPhotos)
            .leftJoin(users, eq(users.id, tripPhotos.uploadedById))
            .where(and(
                eq(tripPhotos.tripId, tripId),
                cursorCondition
            ))
            .orderBy(desc(tripPhotos.createdAt), desc(tripPhotos.id))
            .limit(limit + 1)

        const hasMore = rows.length > limit
        const photos = hasMore ? rows.slice(0, limit) : rows
        const lastPhoto = photos.at(-1)
        const nextCursor = hasMore && lastPhoto ? { createdAt: lastPhoto.createdAt, id: lastPhoto.id } : null

        return { photos, nextCursor }
    })
}

export async function getTripPhoto(tripId: string, photoId: string, userId: string) {
    const [photo] = await db
        .select({
            id: tripPhotos.id,
            createdAt: tripPhotos.createdAt,
            tripId: tripPhotos.tripId,
            uploadedById: tripPhotos.uploadedById,
            imagePath: tripPhotos.imagePath,
            thumbnailPath: tripPhotos.thumbnailPath,
            width: tripPhotos.width,
            height: tripPhotos.height,
            uploader: {
                id: users.id,
                username: users.username,
                profileImg: users.profileImg
            }
        })
        .from(tripPhotos)
        .innerJoin(tripMembers, and(
            eq(tripMembers.tripId, tripPhotos.tripId),
            eq(tripMembers.userId, userId)
        ))
        .leftJoin(users, eq(users.id, tripPhotos.uploadedById))
        .where(and(
            eq(tripPhotos.tripId, tripId),
            eq(tripPhotos.id, photoId)
        ))

    return photo
}

export async function deleteTripPhoto(tripId: string, photoId: string, userId: string) {
    return db.transaction(async (tx) => {
        const [authPhoto] = await tx
            .select({id: tripPhotos.id})
            .from(tripPhotos)
            .innerJoin(trips, eq(trips.id, tripPhotos.tripId))
            .innerJoin(tripMembers, and(eq(tripMembers.tripId, tripPhotos.tripId), eq(tripMembers.userId, userId)))
            .where(and(
                eq(tripPhotos.id, photoId),
                eq(tripPhotos.tripId, tripId),
                or(
                    eq(tripPhotos.uploadedById, userId),
                    eq(trips.ownerId, userId)
                )
            ))
            .for("update")

        if (!authPhoto) return undefined

        const [deletedPhoto] = await tx
            .delete(tripPhotos)
            .where(and(
                eq(tripPhotos.id, photoId),
                eq(tripPhotos.tripId, tripId)
            ))
            .returning()

        if (!deletedPhoto) return undefined

        return deletedPhoto
    })
}