import { Router } from "express";
import { raiseUrgentWithoutTicket } from "../controllers/ticketController.js";
import { limiters } from "../middleware/rateLimit.js";

// Public "I need urgent help" for someone who has no ticket yet.
const router = Router();

router.post("/", limiters.urgent, raiseUrgentWithoutTicket);

export default router;
