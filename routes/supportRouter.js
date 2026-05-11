import express from "express";
import { createSupport, getSupport } from "../controllers/supportController.js";
import { protect } from "../controllers/authController.js";
import { uploadProblemFile } from "../middleware/upload.js";
import { uploadUserProblemToCLoud } from "../middleware/cloudinaryUpload.js";

const supportRouter = express.Router();

supportRouter.route("/getSupport").get(getSupport);
supportRouter
  .route("/createSupport")
  .post(protect, uploadProblemFile, uploadUserProblemToCLoud, createSupport);

export default supportRouter;
