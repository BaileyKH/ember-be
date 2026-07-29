import express, { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { createTripBannerUrl, supabaseAdmin } from "../db/storage.js";
import { authenticateUser } from "./authenticate.js";
import { BadRequestError, NotFoundError } from "./errors.js";
import { randomUUID } from "crypto";
import { updateUserProfileImg } from "../db/queries/users.js";
import { getOwnedTrip, updateTripBannerImg } from "../db/queries/trips.js";
import { validateID } from "./trips.js";

const allowedImgFormats = new Set([
    "jpeg",
    "png",
    "webp"
])

const allowedImgMimes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
])

const profileImgUpload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 5 << 20,
    files: 1
}}).single("image")

const tripBannerImgUpload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 5 << 20,
    files: 1
}}).single("image")

function runMulter(mw: express.RequestHandler, req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
        mw(req, res, (err?: any) => (err ? reject(err) : resolve()))
    })
}

async function parseImage(imgUpload: express.RequestHandler, req: Request, res: Response) {
    try {
        await runMulter(imgUpload, req, res)
    } catch (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                throw new BadRequestError("Image is too large, please try uploading a smaller one")
            }

            throw new BadRequestError("Invalid image upload")
        }

        if (err instanceof BadRequestError) {
            throw err
        }

        throw err
    }
}

async function processProfileImg(imgBuffer: Buffer): Promise<Buffer> {
    try {
        const image = sharp(imgBuffer, {
            failOn: "warning",
            limitInputPixels: 40_000_000
        })

        const metadata = await image.metadata()

        if (!metadata.format || !allowedImgFormats.has(metadata.format)) {
            throw new BadRequestError("Image must be a jpeg, png, or webp")
        }

        return await image
            .autoOrient()
            .resize(512, 512, {
                fit: "cover",
                position: "center",
                withoutEnlargement: true
            })
            .webp({
                quality: 80,
                effort: 4
            })
            .toBuffer()
    } catch(err) {
        if (err instanceof BadRequestError) {
            throw err
        }

        throw new BadRequestError("Image must be a jpeg, png, or webp")
    }
}

async function processTripBannerImg(imgBuffer: Buffer): Promise<Buffer> {
    try {
        const image = sharp(imgBuffer, {
            failOn: "warning",
            limitInputPixels: 40_000_000
        })

        const metadata = await image.metadata()

        if (!metadata.format || !allowedImgFormats.has(metadata.format)) {
            throw new BadRequestError("Image must be a jpeg, png, or webp")
        }

        return await image
            .autoOrient()
            .resize(1600, 600, {
                fit: "cover",
                position: sharp.strategy.attention,
                withoutEnlargement: true
            })
            .webp({
                quality: 80,
                effort: 4
            })
            .toBuffer()
    } catch(err) {
        if (err instanceof BadRequestError) {
            throw err
        }

        throw new BadRequestError("Image must be a jpeg, png, or webp")
    }
}

export async function updateProfileImgHandler(req: Request, res: Response) {
    const userId = await authenticateUser(req)
    
    await parseImage(profileImgUpload, req, res)

    const photo = req.file

    if (!photo) {
        throw new BadRequestError("Profile image is required")
    }

    if (!allowedImgMimes.has(photo.mimetype)) {
        throw new BadRequestError("Image must be a jpeg, png, or webp")
    }

    const processedImg = await processProfileImg(photo.buffer)

    const path = `${userId}/${randomUUID()}.webp`

    const { error } = await supabaseAdmin.storage
        .from("profile-images")
        .upload(path, processedImg, {
            contentType: "image/webp",
            upsert: false
        })

    if (error) {
        throw new Error("Failed to upload profile image, please try again later")
    }

    let updatedUser

    try {

        updatedUser = await updateUserProfileImg(userId, path)

    } catch(err) {

        const { error: cleanupError } = await supabaseAdmin.storage
            .from("profile-images")
            .remove([path])

        if (cleanupError) {
            console.error("Failed to clean up newly uploaded profile image", cleanupError.message)
        }

        throw err
    }

    if (!updatedUser) {
        await supabaseAdmin.storage
            .from("profile-images")
            .remove([path])

        throw new NotFoundError("User not found")
    }

    if (updatedUser.previousPath && updatedUser.previousPath !== path) {
        const { error: cleanupError } = await supabaseAdmin.storage
            .from("profile-images")
            .remove([updatedUser.previousPath])

        if (cleanupError) {
            console.error("Failed to delete previous profile image", cleanupError.message)
        }
    }

    const { data } = supabaseAdmin.storage
        .from("profile-images")
        .getPublicUrl(path)

    return res.status(200).json({ profileImg: data.publicUrl })
    
}

export async function updateTripBannerImgHandler(req: Request, res: Response) {
    const userId = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)
    const ownedTrip = await getOwnedTrip(tripId, userId)

    if (!ownedTrip) {
        throw new NotFoundError("Trip not found")
    }

    await parseImage(tripBannerImgUpload, req, res)

    const photo = req.file

    if (!photo) {
        throw new BadRequestError("Trip banner is required")
    }

    if (!allowedImgMimes.has(photo.mimetype)) {
        throw new BadRequestError("Image must be a jpeg, png, or webp")
    }

    const processedImg = await processTripBannerImg(photo.buffer)

    const path = `${tripId}/${randomUUID()}.webp`

    const { error } = await supabaseAdmin.storage
        .from("trip-banners")
        .upload(path, processedImg, {
            contentType: "image/webp",
            upsert: false
        })

    if (error) {
        throw new Error("Failed to upload trip banner, please try again later")
    }

    let updatedTrip

    try {

        updatedTrip = await updateTripBannerImg(tripId, userId, path)

    } catch(err) {

        const { error: cleanupError } = await supabaseAdmin.storage
            .from("trip-banners")
            .remove([path])

        if (cleanupError) {
            console.error("Failed to clean up newly uploaded trip banner", cleanupError.message)
        }

        throw err
    }

    if (!updatedTrip) {
        const { error: cleanupError } = await supabaseAdmin.storage
            .from("trip-banners")
            .remove([path])
            
        if (cleanupError) {
            console.error("Failed to clean up newly added trip banner")
        }

        throw new NotFoundError("Trip not found")
    }

    if (updatedTrip.previousPath && updatedTrip.previousPath !== path) {
        const { error: cleanupError } = await supabaseAdmin.storage
            .from("trip-banners")
            .remove([updatedTrip.previousPath])

        if (cleanupError) {
            console.error("Failed to delete previous trip banner", cleanupError.message)
        }
    }

    const bannerUrl = await createTripBannerUrl(updatedTrip.bannerImg)

    return res.status(200).json({ bannerImg: bannerUrl })
}