import { Request, Response, NextFunction } from "express";
import { deleteAllUsers } from "../db/queries/users.js";
import { type ApiConfig } from "../config.js";
import { UserForbiddenError } from "./errors.js";

export async function deleteUsersHandler(cfg: ApiConfig, req: Request, res: Response) {
    if (cfg.platform !== "dev") {
        throw new UserForbiddenError("User Reset is only available in dev mode")
    }

    await deleteAllUsers();
    return res.status(200).json({ message: "Database reset to initial state" })
}