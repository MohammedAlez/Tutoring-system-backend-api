import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getProfileController, updateProfileController } from "./user.controller";

export const profileRouter = Router();

// Require authentication for profile management
profileRouter.use(authenticate);

profileRouter.get("/", getProfileController);
profileRouter.patch("/", updateProfileController);

