import { Router } from "express";
import { getDepartmentQueue, listDepartments } from "../controllers/departmentController.js";

const router = Router();

router.get("/", listDepartments);
router.get("/:code/queue", getDepartmentQueue);

export default router;
