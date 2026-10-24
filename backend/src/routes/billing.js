import { Router } from "express";
import {
  handleListBills,
  handleGetBillingSummary,
  handleCollectPayment,
} from "../controllers/billingController.js";

const router = Router();

router.get("/", handleListBills);
router.get("/summary", handleGetBillingSummary);
router.post("/:billId/pay", handleCollectPayment);

export default router;
