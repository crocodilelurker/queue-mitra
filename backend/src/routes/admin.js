import { Router } from "express";
import * as admin from "../controllers/adminController.js";
import { ADMIN_ROLES, protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireRole(...ADMIN_ROLES));

router.get("/overview", admin.getOverview);
router.patch("/hospital", admin.updateHospital);

router.get("/departments", admin.listDepartments);
router.post("/departments", admin.createDepartment);
router.patch("/departments/:id", admin.updateDepartment);
router.delete("/departments/:id", admin.deleteDepartment);

router.get("/doctors", admin.listDoctors);
router.post("/doctors", admin.createDoctor);
router.patch("/doctors/:id", admin.updateDoctor);
router.delete("/doctors/:id", admin.deleteDoctor);

router.get("/staff", admin.listStaff);
router.post("/staff", admin.createStaff);
router.patch("/staff/:id", admin.updateStaff);
router.delete("/staff/:id", admin.deleteStaff);

router.post("/reset-queue", admin.resetQueue);
router.post("/factory-reset", requireRole("superadmin"), admin.factoryReset);

export default router;
