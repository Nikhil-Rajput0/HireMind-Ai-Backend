import express from "express";
import { createSupport, getSupport } from "../controllers/supportController.js";

const supportRouter = express.Router();

supportRouter.route("getSupport").get(getSupport);
supportRouter.route("createSupport").post(createSupport);

export default supportRouter;
