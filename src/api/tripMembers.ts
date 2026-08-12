import { Request, Response } from "express";
import { removeTripMember, leaveTrip } from "../db/queries/tripMembers.js";
import { authenticateUser } from "./authenticate.js";
import { validateID } from "./trips.js";
import { BadRequestError, NotFoundError } from "./errors.js";

export async function removeTripMemberHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    let memberId: string

    try {
        memberId = validateID(req.params.memberId)
    } catch {
        throw new BadRequestError("Invalid trip member ID")
    }

    const removedMember = await removeTripMember(tripId, authUser, memberId)

    if (removedMember.status === "trip_not_found" || removedMember.status === "member_not_found") {
        throw new NotFoundError("Could not find specified trip member")
    }

    if (removedMember.status === "cannot_remove_owner") {
        throw new BadRequestError("Owners of trips cannot be removed")
    }

    return res.status(204).send()
}

export async function leaveTripHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    const removedMember = await leaveTrip(tripId, authUser)

    if (removedMember.status === "not_found") { 
        throw new NotFoundError("Could not find specified trip member") 
    }

    if (removedMember.status === "owner_cannot_leave") { 
        throw new BadRequestError("Owners of trips cannot leave without passing ownership to an existing member") 
    }
    
    return res.status(204).send()
}