import express from "express";
import {
  createInterview,
  getAllInterviews,
} from "../controllers/interviewController.js";
import { protect } from "../controllers/authController.js";

export const interviewRouter = express.Router();

interviewRouter.get("/getAllInterviews", getAllInterviews);
interviewRouter.post("/createInterview", protect, createInterview);
