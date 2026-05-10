import express from "express";
import { createSupport, getSupport } from "../controllers/supportController.js";
import { protect } from "../controllers/authController.js";

const supportRouter = express.Router();

supportRouter.route("/getSupport").get(getSupport);
supportRouter.route("/createSupport").post(protect, createSupport);

export default supportRouter;
