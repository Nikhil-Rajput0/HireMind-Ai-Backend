import express from "express";
import { protect } from "../controllers/authController.js";
import {
  deleteResume,
  generateResume,
  getAllResumes,
  getMyResumes,
  saveResume,
} from "../controllers/resumeController.js";

import { analyzeResume } from "../controllers/resumeAnalysisController.js";
import { uploadResume } from "../middleware/uploadResume.js";

const resumeRouter = express.Router();

resumeRouter.post("/generate", protect, generateResume);
resumeRouter.post("/save", protect, saveResume);
resumeRouter.get("/myResume/:id", getMyResumes);
resumeRouter.delete("/:id", deleteResume);
resumeRouter.delete("/allResumes", getAllResumes);

resumeRouter.post("/analyze", uploadResume, analyzeResume);

export default resumeRouter;
