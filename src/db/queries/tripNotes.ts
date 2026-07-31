import { db } from "../index.js";
import { tripNotes, type NewTripNote, tripMembers } from "../schema.js";
import { and, eq, desc, getTableColumns } from "drizzle-orm";

export type NewTripNoteData = Pick<NewTripNote, "title" | "content">
export type TripNoteUpdate = Partial<NewTripNoteData>

export async function createTripNote(tripId: string, userId: string, note: NewTripNoteData) {
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

        const [createdNote] = await tx
            .insert(tripNotes)
            .values({
                tripId,
                createdById: userId,
                title: note.title,
                content: note.content
            })
            .returning()

        if (!createdNote) {
            throw new Error("Failed to create trip note")
        }

        return createdNote
    })
}

export async function getTripNotes(tripId: string, userId: string) {
    return db.transaction(async (tx) => {
        const [membership] = await tx
            .select({id: tripMembers.id})
            .from(tripMembers)
            .where(and(
                eq(tripMembers.tripId, tripId),
                eq(tripMembers.userId, userId)
            ))
            .for("share")

        if (!membership) return undefined

        return tx
            .select()
            .from(tripNotes)
            .where(and(
                eq(tripNotes.tripId, tripId),
                eq(tripNotes.createdById, userId)
            ))
            .orderBy(desc(tripNotes.createdAt), desc(tripNotes.id))
    })
}

export async function getTripNote(tripId: string, noteId: string, userId: string) {
    const [note] = await db
        .select({
            ...getTableColumns(tripNotes)
        })
        .from(tripNotes)
        .innerJoin(tripMembers, and(eq(tripMembers.tripId, tripNotes.tripId), eq(tripMembers.userId, userId)))
        .where(and(
            eq(tripNotes.id, noteId),
            eq(tripNotes.tripId, tripId),
            eq(tripNotes.createdById, userId)
        ))

    return note
}

export async function editTripNote(tripId: string, noteId: string, userId: string, updates: TripNoteUpdate) {
    return db.transaction(async (tx) => {
        const [authorizedNote] = await tx
            .select({id: tripNotes.id})
            .from(tripNotes)
            .innerJoin(tripMembers, and(eq(tripMembers.tripId, tripNotes.tripId), eq(tripMembers.userId, userId)))
            .where(and(
                eq(tripNotes.id, noteId),
                eq(tripNotes.tripId, tripId),
                eq(tripNotes.createdById, userId)
            ))
            .for("update")

        if (!authorizedNote) return undefined

        const [updatedNote] = await tx
            .update(tripNotes)
            .set(updates)
            .where(and(
                eq(tripNotes.id, noteId),
                eq(tripNotes.tripId, tripId),
                eq(tripNotes.createdById, userId)
            ))
            .returning()

        if (!updatedNote) {
            throw new Error("Failed to update trip note")
        }

        return updatedNote
    })
}

export async function deleteTripNote(tripId: string, noteId: string, userId: string) {
    return db.transaction(async (tx) => {
        const [authorizedNote] = await tx
            .select({ id: tripNotes.id })
            .from(tripNotes)
            .innerJoin(tripMembers, and(eq(tripMembers.tripId, tripNotes.tripId), eq(tripMembers.userId, userId)))
            .where(and(
                eq(tripNotes.id, noteId),
                eq(tripNotes.tripId, tripId),
                eq(tripNotes.createdById, userId)
            ))
            .for("update")

        if (!authorizedNote) return undefined

        const [deletedNote] = await tx
            .delete(tripNotes)
            .where(and(
                eq(tripNotes.id, noteId),
                eq(tripNotes.tripId, tripId),
                eq(tripNotes.createdById, userId)
            ))
            .returning()

        if (!deletedNote) {
            throw new Error("Failed to delete trip note")
        }

        return deletedNote
    })
}