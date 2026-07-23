import { Request, Response } from "express";
import { BadRequestError, NotFoundError } from "./errors.js";
import { createTrip, getAllUsersTrips, getUsersTrip } from "../db/queries/trips.js";
import { authenticateUser } from "./authenticate.js";

const MAX_TRIP_TEXT_LENGTH = 256
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function newTripHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)

    const { name, location, description, bannerImg, startDate, endDate } = req.body ?? {}

    const validName = validateRequiredText(name, "name", MAX_TRIP_TEXT_LENGTH)
    const validLocation = validateRequiredText(location, "location", MAX_TRIP_TEXT_LENGTH)
    const validDescription = validateOptionalText(description, "description", MAX_TRIP_TEXT_LENGTH)
    const validStartDate = validateDate(startDate, "start date")
    const validEndDate = validateDate(endDate, "end date")

    if (validStartDate && validEndDate && validEndDate < validStartDate) {
        throw new BadRequestError("End date cannot be before start date")
    }

    if (bannerImg !== undefined && bannerImg !== null && typeof bannerImg !== "string") {
        throw new BadRequestError("Please provide a valid image")
    }

    const newTrip = {
        name: validName,
        location: validLocation,
        description: validDescription,
        bannerImg: bannerImg?.trim() || null,
        startDate: validStartDate,
        endDate: validEndDate,
    }

    const trip = await createTrip(newTrip, authUser)

    return res.status(201).json(trip)
}

export async function getAllTripsHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)

    const trips = await getAllUsersTrips(authUser)

    if (!trips || trips.length === 0) {
        return res.status(200).json([])
    }

    return res.status(200).json(trips)
}

export async function getTripHandler(req: Request, res: Response) {
    const tripId = validateID(req.params.tripId)

    const trip = await getUsersTrip(tripId)

    if (!trip) {
        throw new NotFoundError("Could not find specified trip")
    }

    return res.status(200).json(trip)
}

export function validateRequiredText(text: unknown, field: string, maxLength: number): string {

    if (typeof text !== "string") {
        throw new BadRequestError(`${field} is required`)
    }

    const normalizedText = text.trim()

    if (normalizedText.length === 0) {
        throw new BadRequestError(`${field} is required`)
    }

    if (normalizedText.length > maxLength) {
        throw new BadRequestError(`${field} can not be longer than ${maxLength} characters`)
    }

    return normalizedText
}

export function validateOptionalText(text: unknown, field: string, maxLength: number): string | null {

    if (text === undefined || text === null) {
        return null
    }

    if (typeof text !== "string") {
        throw new BadRequestError(`${field} must be a string`)
    }

    const normalizedText = text.trim()

    if (normalizedText.length > maxLength) {
        throw new BadRequestError(
            `${field} cannot exceed ${maxLength} characters`,
        )
    }

    return normalizedText || null
}

export function validateDate(date: unknown, field: string): string | null {

    if (date === undefined || date === null) {
        return null
    }

    if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
        throw new BadRequestError(
            `${field} must use the YYYY-MM-DD format`,
        )
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`)

    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
        throw new BadRequestError(`${field} is not a valid date`)
    }

    return date
}

export function validateID(id: unknown): string {
    const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (typeof id !== "string" || !idPattern.test(id)) {
        throw new BadRequestError("No trip found")
    }

    return id
}