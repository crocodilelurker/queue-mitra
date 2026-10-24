import { Router } from "express";
import {
  handleGetOverview,
  handleListDoctors,
  handleCreateDoctor,
  handleUpdateDoctor,
  handleUpdateDoctorStatus,
  handleDeleteDoctor,
  handleListStaff,
  handleCreateStaff,
  handleUpdateStaff,
  handleDeleteStaff,
  handleResetMockData,
} from "../controllers/adminController.js";

const router = Router();

// MediFlow Overview
router.get("/overview", handleGetOverview);

// Doctor Management
router.get("/doctors", handleListDoctors);
router.post("/doctors", handleCreateDoctor);
router.patch("/doctors/:id", handleUpdateDoctor);
router.patch("/doctors/:id/status", handleUpdateDoctorStatus);
router.delete("/doctors/:id", handleDeleteDoctor);

// Staff Management
router.get("/staff", handleListStaff);
router.post("/staff", handleCreateStaff);
router.patch("/staff/:id", handleUpdateStaff);
router.delete("/staff/:id", handleDeleteStaff);

// Purge / Reset Mock Data
router.post("/purge-mock-data", handleResetMockData);
router.post("/reset-data", handleResetMockData);

export default router;
