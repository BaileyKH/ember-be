import express, { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { createTripBannerUrl, supabaseAdmin } from "../db/storage.js";
import { authenticateUser } from "./authenticate.js";
import { BadRequestError, NotFoundError } from "./errors.js";
import { randomUUID } from "crypto";
import { updateUserProfileImg } from "../db/queries/users.js";
import { getOwnedTrip, getUsersTrip, updateTripBannerImg } from "../db/queries/trips.js";
import { validateID } from "./trips.js";
import { addTripPhoto, getTripPhoto, getTripPhotos, deleteTripPhoto, type PhotoCursor } from "../db/queries/tripPhotos.js";

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

type ProcessedTripPhoto = {
    imageBuffer: Buffer,
    thumbnailBuffer: Buffer,
    width: number,
    height: number
}

const profileImgUpload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 5 << 20,
    files: 1
}}).single("image")

const tripBannerImgUpload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 5 << 20,
    files: 1
}}).single("image")

const tripPhotosUpload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 10 << 20,
    files: 1
} }).single("image")

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

async function processTripPhoto(imgBuffer: Buffer): Promise<ProcessedTripPhoto> {
    try {
        const image = sharp(imgBuffer, {
            failOn: "warning",
            limitInputPixels: 50_000_000
        })

        const metadata = await image.metadata()

        if (!metadata.format || !allowedImgFormats.has(metadata.format)) {
            throw new BadRequestError("Image must be a jpeg, png, or webp")
        }

        const { data: imageBuffer, info } = await sharp(imgBuffer, {
            failOn: "warning",
            limitInputPixels: 50_000_000
        })
            .autoOrient()
            .resize({
                width: 2400,
                height: 2400,
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({
                quality: 82,
                effort: 4
            })
            .toBuffer({ resolveWithObject: true })

        const thumbnailBuffer = await sharp(imageBuffer)
            .resize({
                width: 600,
                height: 600,
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({
                quality: 75,
                effort: 4
            })
            .toBuffer()

        return { imageBuffer, thumbnailBuffer, width: info.width, height: info.height }

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

export async function addTripPhotoHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    const trip = await getUsersTrip(tripId, authUser)

    if (!trip) {
        throw new NotFoundError("Could not find specified trip")
    }

    await parseImage(tripPhotosUpload, req, res)

    const photo = req.file

    if (!photo) {
        throw new BadRequestError("Trip photo is required")
    }

    if (!allowedImgMimes.has(photo.mimetype)) {
        throw new BadRequestError("Image must be a jpeg, png, or webp")
    }

    const processedPhoto = await processTripPhoto(photo.buffer)
    const photoId = randomUUID()

    const imgPath = `${tripId}/${photoId}/image.webp`
    const thumbnailPath = `${tripId}/${photoId}/thumbnail.webp`

    const storage = supabaseAdmin.storage.from("trip-photos")

    const result = await (async () => {
        try {
            const [imageUpload, thumbnailUpload] = await Promise.all([
                storage.upload(imgPath, processedPhoto.imageBuffer, {
                    contentType: "image/webp",
                    upsert: false
                }),
                storage.upload(thumbnailPath, processedPhoto.thumbnailBuffer, {
                    contentType: "image/webp",
                    upsert: false
                })
            ])

            if (imageUpload.error || thumbnailUpload.error) {
                throw new Error("Failed to upload trip photo, please try again later")
            }

            const { data: signedUrls, error: signedUrlError } = await storage.createSignedUrls([imgPath, thumbnailPath], 60 * 60)

            if (signedUrlError || !signedUrls) {
                throw new Error("Failed to create trip photo url")
            }

            const imgUrl = signedUrls.find(signed => signed.path === imgPath)
            const thumbnailUrl = signedUrls.find(signed => signed.path === thumbnailPath)

            if (!imgUrl?.signedUrl || imgUrl.error || !thumbnailUrl?.signedUrl || thumbnailUrl.error) {
                throw new Error("Failed to create trip photo urls")
            }

            const savedPhoto = await addTripPhoto(tripId, authUser, {
                id: photoId,
                imagePath: imgPath,
                thumbnailPath,
                width: processedPhoto.width,
                height: processedPhoto.height
            })

            if (!savedPhoto) {
                throw new NotFoundError("Could not find specified trip")
            }

            return { savedPhoto, imageUrl: imgUrl.signedUrl, thumbnailUrl: thumbnailUrl.signedUrl }

        } catch(err) {
            const { error: cleanupError } = await storage.remove([imgPath, thumbnailPath])

            if (cleanupError) {
                console.error("Failed to clean up trip photo upload")
            }

            throw err
        }
    })()

    const tripPhoto = {
        id: result.savedPhoto.id,
        createdAt: result.savedPhoto.createdAt,
        tripId: result.savedPhoto.tripId,
        uploadedById: result.savedPhoto.uploadedById,
        width: result.savedPhoto.width,
        height: result.savedPhoto.height,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl
    }

    return res.status(201).json(tripPhoto)

}

export async function getTripPhotosHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    const queryLimit = req.query.limit
    let photoLimit = 20 

    if (queryLimit !== undefined) {
        if (typeof queryLimit !== "string" || !/^[1-9]\d*$/.test(queryLimit) ) {
            throw new BadRequestError("Photo limit must be greater or equal to one")
        }

        photoLimit = Number(queryLimit)

        if (photoLimit < 1 || photoLimit > 50) {
            throw new BadRequestError("Photo limit must be between one and fifty")
        }
    }

    const cursorCreatedAt = req.query.cursorCreatedAt
    const cursorId = req.query.cursorId

    let cursor: PhotoCursor | undefined

    if (cursorCreatedAt !== undefined || cursorId !== undefined) {
        if (typeof cursorCreatedAt !== "string" || typeof cursorId !== "string") {
            throw new BadRequestError("Invalid photo cursor")
        }

        const createdAt = new Date(cursorCreatedAt)

        if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== cursorCreatedAt) {
            throw new BadRequestError("Invalid photo cursor")
        }

        let validCursorId: string

        try {
            validCursorId = validateID(cursorId)

        } catch {
            throw new BadRequestError("Invalid photo cursor")
        }

        cursor = { createdAt, id: validCursorId }

    }

    const result = await getTripPhotos(tripId, authUser, photoLimit, cursor)

    if (!result) {
        throw new NotFoundError("Could not find specified trip")
    }

    const thumbnailPaths = result.photos.map(photo => photo.thumbnailPath)
    const signedUrlByPath = new Map<string, string>()

    if (thumbnailPaths.length > 0) {
        const { data: signedUrls, error } = await supabaseAdmin.storage
            .from("trip-photos")
            .createSignedUrls(thumbnailPaths, 60 * 60)

        if (error || !signedUrls) {
            throw new Error("Failed to create trip photo urls")
        }

        for (const signed of signedUrls) {
            if (signed.error || !signed.path || !signed.signedUrl) {
                throw new Error("Failed to create trip photo urls")
            }

            signedUrlByPath.set(signed.path, signed.signedUrl)
        }
    }

    const photos = result.photos.map(photo => {
        const thumbnailUrl = signedUrlByPath.get(photo.thumbnailPath)

        if (!thumbnailUrl) {
            throw new Error("Failed to create trip photo url")
        }

        let profileImg: string | null = null

        if (photo.uploader?.profileImg) {
            const { data } = supabaseAdmin.storage
                .from("profile-images")
                .getPublicUrl(photo.uploader.profileImg)

            profileImg = data.publicUrl
        }

        return {
            id: photo.id,
            createdAt: photo.createdAt,
            tripId: photo.tripId,
            uploadedById: photo.uploadedById,
            width: photo.width,
            height: photo.height,
            thumbnailUrl,
            uploader: photo.uploader ? { id: photo.uploader.id, username: photo.uploader.username, profileImg } : null
        }
    })

    return res.status(200).json({ photos, nextCursor: result.nextCursor })

}

export async function getTripPhotoHandler(req: Request, res: Response) {
    const authUser = await authenticateUser(req)
    const tripId = validateID(req.params.tripId)

    let photoId: string

    try {
        photoId = validateID(req.params.photoId)

    } catch {
        throw new BadRequestError("Could not find specified trip photo")
    }

    const photo = await getTripPhoto(tripId, photoId, authUser)

    if (!photo) {
        throw new NotFoundError("Could not find specified trip photo")
    }

    const { data: signedImage, error: signedImageError } = await supabaseAdmin.storage
        .from("trip-photos")
        .createSignedUrl(photo.imagePath, 60 * 60) 

    if (signedImageError || !signedImage.signedUrl) {
        throw new Error("Failed to create trip photo url")
    }

    let profileImg: string | null = null

    if (photo.uploader?.profileImg) {
        const { data } = supabaseAdmin.storage
            .from("profile-images")
            .getPublicUrl(photo.uploader.profileImg)

        profileImg = data.publicUrl
    }

    const tripPhoto = {
        id: photo.id,
        createdAt: photo.createdAt,
        tripId: photo.tripId,
        uploadedById: photo.uploadedById,
        width: photo.width,
        height: photo.height,
        imageUrl: signedImage.signedUrl,
        uploader: photo.uploader ? { id: photo.uploader.id, username: photo.uploader.username, profileImg } : null
    }

    return res.status(200).json(tripPhoto)
}

export async function deleteTripPhotoHandler(req: Request, res: Response) {}