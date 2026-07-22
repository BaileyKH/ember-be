import express, { Request, Response, NextFunction } from "express"
import { cfg } from "./config.js"
import { middlewareErrorHandler } from "./api/middleware.js"
import { createUserHandler } from "./api/users.js"
import { loginHandler } from "./api/auth.js"
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

app.post("/api/reset", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(deleteUsersHandler(cfg.api, req, res)).catch(next)
})

app.use(middlewareErrorHandler)

app.listen(PORT, () => {
    console.log(`Server Started on Port: ${PORT}`)
})