import express from "express";
import {
  createSubscription,
  getSubscription,
} from "../controllers/subscriptionController.js";

const planRouter = express.Router();

planRouter.route("/plan").get(getSubscription).post(createSubscription);

export default planRouter;
