import { db } from "../index.js";
import { NewTrip, tripMembers, trips, ExistingTrip } from "../schema.js";
import { and, eq, getTableColumns, desc } from "drizzle-orm";

type TripDetails = Omit<NewTrip, "ownerId">;
export type TripUpdates = Partial<Pick<NewTrip, "name" | "location" | "description" | "bannerImg" | "startDate" | "endDate">>
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

export async function deleteTrip(tripId: string, userId: string) {
    const [result] =  await db
        .delete(trips)
        .where(and(
            eq(trips.id, tripId),
            eq(trips.ownerId, userId)
        ))
        .returning()

    return result

}

export async function editTrip(tripId: string, userId: string, data: TripUpdates): Promise<EditTripResult> {
    return db.transaction(async (tx) => {
        const [existingTrip] = await tx
            .select()
            .from(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, userId),
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
                eq(trips.ownerId, userId),
            ))
            .returning()

        if (!updatedTrip) {
            return { status: "not_found" }
        }

        return { status: "updated", trip: updatedTrip }

    })
}