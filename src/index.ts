import express, { Request, Response, NextFunction } from "express"
import { cfg } from "./config.js"
import { middlewareErrorHandler } from "./api/middleware.js"
import { createUserHandler } from "./api/users.js"

const app = express()
const PORT = cfg.api.port

app.use(express.json())

app.post("/api/users", (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(createUserHandler(req, res)).catch(next)
})

app.use(middlewareErrorHandler)

app.listen(PORT, () => {
    console.log(`Server Started on Port: ${PORT}`)
})