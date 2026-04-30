import express from "express";
import { createSupport, getSupport } from "../controllers/supportController.js";

const supportRouter = express.Router();

supportRouter.route("support").get(getSupport).post(createSupport);

export default supportRouter;
