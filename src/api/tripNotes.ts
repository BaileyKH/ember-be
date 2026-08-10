import { Request, Response } from "express";
import { authenticateUser } from "./authenticate.js";
import { type NewTripNoteData, type TripNoteUpdate, createTripNote, getTripNotes, getTripNote, editTripNote, deleteTripNote } from "../db/queries/tripNotes.js";
import { validateID, validateRequiredText } from "./trips.js";
import { NotFoundError, BadRequestError } from "./errors.js";


const maxTitleLength = 256
const maxContentLength = 10_000

export async function createTripNoteHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    const { title, content } = req.body ?? {}

    const validatedTitle = validateRequiredText(title, "Note title", maxTitleLength)
    const validatedContent = validateRequiredText(content, "Note content", maxContentLength)

    const noteData: NewTripNoteData = {
        title: validatedTitle,
        content: validatedContent
    }

    const newNote = await createTripNote(tripId, authUser, noteData)

    if (!newNote) {
        throw new NotFoundError("Could not find specified trip")
    }

    return res.status(201).json(newNote)
}

export async function getTripNotesHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    const notes = await getTripNotes(tripId, authUser)

    if (!notes) {
        throw new NotFoundError("Could not find specified trip")
    }

    return res.status(200).json(notes)
}

export async function getTripNoteHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)
    
    let noteId: string

    try {
        noteId = validateID(req.params.noteId)

    } catch {
        
        throw new BadRequestError("Invalid trip note ID")
    }

    const note = await getTripNote(tripId, noteId, authUser)

    if (!note) {
        throw new NotFoundError("Could not find specified note")
    }

    return res.status(200).json(note)
}

export async function editTripNoteHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    let noteId: string

    try {
        noteId = validateID(req.params.noteId)

    } catch {
        
        throw new BadRequestError("Invalid trip note ID")
    }

    const { title, content } = req.body ?? {}
    const updates: TripNoteUpdate = {}

    if (title !== undefined) {
        updates.title = validateRequiredText(title, "Note title", maxTitleLength)
    }

    if (content !== undefined) {
        updates.content = validateRequiredText(content, "Note content", maxContentLength)
    }

    if (Object.keys(updates).length === 0) {
        throw new BadRequestError("Must change at least one note detail")
    }

    const updatedNote = await editTripNote(tripId, noteId, authUser, updates)

    if (!updatedNote) {
        throw new NotFoundError("Could not find specified note")
    }

    return res.status(200).json(updatedNote)


}

export async function deleteTripNoteHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    let noteId: string

    try {
        noteId = validateID(req.params.noteId)

    } catch {
        
        throw new BadRequestError("Invalid trip note ID")
    }

    const deletedNote = await deleteTripNote(tripId, noteId, authUser)

    if (!deletedNote) {
        throw new NotFoundError("Could not find specified note")
    }

    return res.status(204).send()
}