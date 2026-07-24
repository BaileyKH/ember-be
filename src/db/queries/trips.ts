import { db } from "../index.js";
import { NewTrip, tripMembers, trips } from "../schema.js";
import { and, eq, getTableColumns, desc } from "drizzle-orm";

type TripDetails = Omit<NewTrip, "ownerId">;

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

export async function deleteTrip(tripId: string, userId: string) {
    const [result] =  await db
        .delete(trips)
        .where(
            and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            )
        )
        .returning()

    return result

}

export async function editTrip(tripId: string, userId: string, data: Partial<Pick<NewTrip, 'name' | 'location' | 'description' | 'bannerImg' | 'startDate' | 'endDate'>>) {
    const [result] = await db
        .update(trips)
        .set(data)
        .where(
            and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId)
            )
        )
        .returning()

    return result
}