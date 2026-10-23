import { Router } from "express";
import {
  getDepartmentQueue,
  getHospital,
  listDepartments,
  listHospitals,
} from "../controllers/hospitalController.js";

const router = Router();

router.get("/", listHospitals);
router.get("/:code", getHospital);
router.get("/:code/departments", listDepartments);
router.get("/:code/departments/:deptCode/queue", getDepartmentQueue);

export default router;
