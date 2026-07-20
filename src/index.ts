import express from "express"
import { cfg } from "./config.js"

const app = express()

app.use(express.json())

app.listen(cfg.api.port, () => {
    console.log(`Server Started on Port: ${cfg.api.port}`)
})