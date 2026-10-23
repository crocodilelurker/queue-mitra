import { Router } from "express";
import { getBoardData } from "../controllers/boardController.js";

const router = Router();

// GET /api/board/:hospitalCode (e.g. /api/board/CDH)
router.get("/:hospitalCode", getBoardData);

export default router;
