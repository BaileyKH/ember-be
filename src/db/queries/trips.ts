import { db } from "../index.js";
import { NewTrip, tripMembers, trips, ExistingTrip } from "../schema.js";
import { and, eq, getTableColumns, desc } from "drizzle-orm";
import { tripPhotos } from "../schema.js";

type TripDetails = Omit<NewTrip, "ownerId" | "bannerImg">;
export type TripUpdates = Partial<Pick<NewTrip, "name" | "location" | "description" | "startDate" | "endDate">>
export type EditTripResult = | {status: "updated", trip: ExistingTrip} | {status: "not_found"} | {status: "invalid_date_order"}

export async function createTrip(trip: TripDetails, ownerId: string){
    return db.transaction(async (tx) => {
        const [createdTrip] = await tx
            .insert(trips)
            .values({
                ...trip,
                ownerId,
            })
            .returning();

        if (!createdTrip) {
            throw new Error("Failed to create trip");
        }

        await tx
            .insert(tripMembers)
            .values({
                tripId: createdTrip.id,
                userId: ownerId,
            });

        return createdTrip;
    });
}
 
export async function getAllUsersTrips(userId: string) {
    const result = await db
        .select({
            ...getTableColumns(trips)
        })
        .from(trips)
        .innerJoin(tripMembers, eq(tripMembers.tripId, trips.id))
        .where(eq(tripMembers.userId, userId))
        .orderBy(desc(trips.createdAt))

    return result
}

export async function getUsersTrip(tripId: string, userId: string) {
    const [trip] = await db
        .select({
            ...getTableColumns(trips)
        })
        .from(trips)
        .innerJoin(tripMembers, eq(tripMembers.tripId, trips.id))
        .where(and(
            eq(trips.id, tripId),
            eq(tripMembers.userId, userId)
        ))

    return trip
}

export async function getOwnedTrip(tripId: string, userId: string) {
    const [trip] = await db
        .select({ id: trips.id })
        .from(trips)
        .where(and(
            eq(trips.id, tripId),
            eq(trips.ownerId, userId)
        ))

    return trip
}

export async function deleteTrip(tripId: string, userId: string) {
    return db.transaction(async (tx) => {
        const [existingTrip] = await tx 
            .select()
            .from(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .for("update")

        if (!existingTrip) return undefined

        const photos = await tx
            .select({imagePath: tripPhotos.imagePath, thumbnailPath: tripPhotos.thumbnailPath})
            .from(tripPhotos)
            .where(eq(tripPhotos.tripId, tripId))

        const [deletedTrip] = await tx
            .delete(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .returning()

        if (!deletedTrip) return undefined

        const photoPaths = photos.flatMap(photo => [photo.imagePath, photo.thumbnailPath])

        return { trip: deletedTrip, photoPaths }
    })

}

export async function editTrip(tripId: string, userId: string, data: TripUpdates): Promise<EditTripResult> {
    return db.transaction(async (tx) => {
        const [existingTrip] = await tx
            .select()
            .from(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .for("update")

        if (!existingTrip) {
            return { status: "not_found" }
        }

        const updateStartDate = data.startDate !== undefined ? data.startDate : existingTrip.startDate

        const updateEndDate = data.endDate !== undefined ? data.endDate : existingTrip.endDate

        if (updateStartDate && updateEndDate && updateEndDate < updateStartDate) {
            return { status: "invalid_date_order" }
        }

        const [updatedTrip] = await tx
            .update(trips)
            .set(data)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .returning()

        if (!updatedTrip) {
            return { status: "not_found" }
        }

        return { status: "updated", trip: updatedTrip }

    })
}

export async function updateTripBannerImg(tripId: string, userId: string, imgPath: string) {
    return db.transaction(async (tx) => {
        const [existingTrip] = await tx
            .select({ bannerImg: trips.bannerImg })
            .from(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .for("update")

        if (!existingTrip) return undefined

        const [updatedTrip] = await tx
            .update(trips)
            .set({ bannerImg: imgPath })
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            ))
            .returning({bannerImg: trips.bannerImg})

        if (!updatedTrip) return undefined

        return { bannerImg: updatedTrip.bannerImg, previousPath: existingTrip.bannerImg }
    })
}