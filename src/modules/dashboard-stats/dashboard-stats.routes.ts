import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getDashboardStatsController } from "./dashboard-stats.controller";
 // Adjust import paths based on your folder structure

export const dashboardStatsRouter = Router();

// Apply authentication middleware to all routes in this router
dashboardStatsRouter.use(authenticate);

// Dashboard Routes
dashboardStatsRouter.get("/", getDashboardStatsController);


