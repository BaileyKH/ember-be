import express, { Request, Response, NextFunction } from "express"
import { cfg } from "./config.js"
import { middlewareErrorHandler } from "./api/middleware.js"
import { createUserHandler } from "./api/users.js"
import { loginHandler, refreshHandler, revokeHandler } from "./api/auth.js"
import { deleteUsersHandler } from "./api/reset.js"
import { newTripHandler, getAllTripsHandler, getTripHandler, deleteTripHandler, editTripHandler } from "./api/trips.js"
import { updateProfileImgHandler, updateTripBannerImgHandler } from "./api/images.js"
import { addTripPhotoHandler, getTripPhotosHandler, getTripPhotoHandler, deleteTripPhotoHandler } from "./api/images.js"
import { createTripNoteHandler, deleteTripNoteHandler, editTripNoteHandler, getTripNoteHandler, getTripNotesHandler } from "./api/tripNotes.js"

const app = express()
const PORT = cfg.api.port

app.use(express.json())

app.get("/api/trips", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getAllTripsHandler(req, res)).catch(next)
})

app.get("/api/trips/:tripId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getTripHandler(req, res)).catch(next)
})

app.get("/api/trips/:tripId/photos", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getTripPhotosHandler(req, res)).catch(next)
})

app.get("/api/trips/:tripId/photos/:photoId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getTripPhotoHandler(req, res)).catch(next)
})

app.get("/api/trips/:tripId/notes", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getTripNotesHandler(req, res)).catch(next)
})

 app.get("/api/trips/:tripId/notes/:noteId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(getTripNoteHandler(req, res)).catch(next)
})

app.post("/api/users", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(createUserHandler(req, res)).catch(next)
})

app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(loginHandler(req, res)).catch(next)
})

app.post("/api/refresh", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(refreshHandler(req, res)).catch(next)
})

app.post("/api/revoke", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(revokeHandler(req, res)).catch(next)
})

app.post("/api/trips", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(newTripHandler(req, res)).catch(next)
})

app.post("/api/trips/:tripId/photos", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(addTripPhotoHandler(req, res)).catch(next)
})

app.post("/api/trips/:tripId/notes", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(createTripNoteHandler(req, res)).catch(next)
})

app.put("/api/me/profile-image", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(updateProfileImgHandler(req, res)).catch(next)
})

app.put("/api/trips/:tripId/banner", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(updateTripBannerImgHandler(req, res)).catch(next)
})

app.patch("/api/trips/:tripId", (req, res, next) => {
    Promise.resolve(editTripHandler(req, res)).catch(next)
})

app.patch("/api/trips/:tripId/notes/:noteId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(editTripNoteHandler(req, res)).catch(next)
})

app.delete("/api/trips/:tripId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteTripHandler(req, res)).catch(next)
})

app.delete("/api/trips/:tripId/photos/:photoId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteTripPhotoHandler(req, res)).catch(next)
})

app.delete("/api/trips/:tripId/notes/:noteId", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteTripNoteHandler(req, res)).catch(next)
})

// FOR DEVELOPMENT ONLY
app.post("/api/reset", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteUsersHandler(cfg.api, req, res)).catch(next)
})

app.use(middlewareErrorHandler)

app.listen(PORT, () => {
    console.log(`Server Started on Port: ${PORT}`)
})