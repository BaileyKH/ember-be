import { db } from "../index.js";
import { tripMembers, type ExistingMember, trips } from "../schema.js";
import { eq, and } from "drizzle-orm";

export type RemoveTripMemberResult =
    | { status: "removed", member: ExistingMember }
    | { status: "trip_not_found" }
    | { status: "member_not_found" }
    | { status: "cannot_remove_owner" }

export type LeaveTripResult =
    | { status: "left" }
    | { status: "not_found" }
    | { status: "owner_cannot_leave" }

export async function removeTripMember(tripId: string, ownerId: string, memberId: string): Promise<RemoveTripMemberResult> {
    return db.transaction(async (tx) => {
        const [ownedTrip] = await tx
            .select({ ownerId: trips.ownerId })
            .from(trips)
            .where(and(
                eq(trips.id, tripId),
                eq(trips.ownerId, ownerId)
            ))
            .for("update")

        if (!ownedTrip) return { status: "trip_not_found" }

        if (memberId === ownedTrip.ownerId) return { status: "cannot_remove_owner" }

        const [removedMember] = await tx
            .delete(tripMembers)
            .where(and(
                eq(tripMembers.tripId, tripId),
                eq(tripMembers.userId, memberId)
            ))
            .returning()

        if (!removedMember) return { status: "member_not_found" }

        return { status: "removed", member: removedMember }
    })
}

export async function leaveTrip(tripId: string, userId: string): Promise<LeaveTripResult> {
    return db.transaction(async (tx) => {
        const [trip] = await tx
            .select({ ownerId: trips.ownerId })
            .from(trips)
            .where(eq(trips.id, tripId))
            .for("update")

        if (!trip) return { status: "not_found" }

        if (trip.ownerId === userId) return { status: "owner_cannot_leave" }

        const [deletedMember] = await tx
            .delete(tripMembers)
            .where(and(
                eq(tripMembers.tripId, tripId),
                eq(tripMembers.userId, userId)
            ))
            .returning({ id: tripMembers.id })

        if (!deletedMember) return { status: "not_found" }

        return { status: "left" }
    })
}