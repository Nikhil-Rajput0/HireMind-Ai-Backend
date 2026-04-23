import express from "express";
import { protect } from "../controllers/authController.js";
import {
  deleteResume,
  generateResume,
  getMyResumes,
  saveResume,
} from "../controllers/resumeController.js";

const resumeRouter = express.Router();

resumeRouter.post("/generate", protect, generateResume);
resumeRouter.post("/save", protect, saveResume);
resumeRouter.get("/myResume/:id", getMyResumes);
resumeRouter.delete("/:id", deleteResume);

export default resumeRouter;
