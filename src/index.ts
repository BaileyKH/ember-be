import express, { Request, Response, NextFunction } from "express"
import { cfg } from "./config.js"
import { middlewareErrorHandler } from "./api/middleware.js"
import { createUserHandler } from "./api/users.js"
import { loginHandler, refreshHandler, revokeHandler } from "./api/auth.js"
import { deleteUsersHandler } from "./api/reset.js"

const app = express()
const PORT = cfg.api.port

app.use(express.json())

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

// FOR DEVELOPMENT ONLY
app.post("/api/reset", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteUsersHandler(cfg.api, req, res)).catch(next)
})

app.use(middlewareErrorHandler)

app.listen(PORT, () => {
    console.log(`Server Started on Port: ${PORT}`)
})