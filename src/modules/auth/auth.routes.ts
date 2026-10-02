import { Router } from "express";
import {
  changePasswordController,
  loginController,
  logoutController,
  meController,
  refreshTokenController,
  registerTutorController,
} from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.post("/register", registerTutorController);
router.post("/login", loginController);
router.post("/refresh", refreshTokenController);

router.get("/me", authenticate, meController);
router.post("/logout", authenticate, logoutController);
router.post("/change-password", authenticate, changePasswordController);

export default router;