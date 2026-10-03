import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getSessionsController } from "./session.controller";
 // Adjust import paths based on your folder structure

export const sessionRouter = Router();

// Apply authentication middleware to all routes in this router
sessionRouter.use(authenticate);

sessionRouter.get("/sessions", getSessionsController);


