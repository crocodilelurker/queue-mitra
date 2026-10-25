import { Router } from "express";
import { login, loginStaffPin, logout, me } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { limiters } from "../middleware/rateLimit.js";

// Accounts are only created by an admin (POST /api/admin/doctors, /api/admin/staff) or in /setup.
const router = Router();

router.post("/login", limiters.login, login);
router.post("/staff-pin", limiters.staffPin, loginStaffPin);
router.post("/logout", protect, logout);
router.get("/me", protect, me);

export default router;
