import express from "express"
import { cfg } from "./config.js"
import { middlewareErrorHandler } from "./api/middleware.js"

const app = express()

app.use(express.json())

app.use(middlewareErrorHandler)

app.listen(cfg.api.port, () => {
    console.log(`Server Started on Port: ${cfg.api.port}`)
})