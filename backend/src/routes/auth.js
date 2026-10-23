import { Router } from "express";
import { login, loginStaffPin, logout, me, registerDoctor } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register/doctor", registerDoctor);
router.post("/login", login);
router.post("/staff-pin", loginStaffPin);
router.post("/logout", protect, logout);
router.get("/me", protect, me);

export default router;
