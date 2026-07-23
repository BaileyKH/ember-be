import { db } from "../index.js";
import { NewTrip, tripMembers, trips } from "../schema.js";
import { and, eq } from "drizzle-orm";

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

// BAILEY NOTE: will need to update this to include trips where users are members as well 
export async function getAllUsersTrips(ownerId: string) {
    const result = await db
        .select()
        .from(trips)
        .where(eq(trips.ownerId, ownerId))

    return result
}

// BAILEY NOTE: will need to update this to only allow if user is member or owner of specific trip
export async function getUsersTrip(tripId: string) {
    const [trip] = await db
        .select()
        .from(trips)
        .where(eq(trips.id, tripId))

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