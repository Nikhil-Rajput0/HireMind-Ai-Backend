import express from "express";
import {
  createInterview,
  deleteOneInterview,
  evaluateAnswer,
  finishInterview,
  generateQuestion,
  getAllInterviews,
  getInterviewById,
  saveAnswer,
} from "../controllers/interviewController.js";
import { protect } from "../controllers/authController.js";

export const interviewRouter = express.Router();

interviewRouter.post("/create", protect, createInterview);
interviewRouter.post("/question", generateQuestion);
interviewRouter.post("/evaluate", evaluateAnswer);
interviewRouter.post("/save", saveAnswer);
interviewRouter.post("/finish", finishInterview);
interviewRouter.get("/getAllInterviews", getAllInterviews);
interviewRouter.get("/:id", getInterviewById);
interviewRouter.delete("/:id", deleteOneInterview);
