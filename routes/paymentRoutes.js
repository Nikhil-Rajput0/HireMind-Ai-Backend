import express from "express";
import {
  createOrder,
  getCurrentPlan,
  getPaymentHistory,
} from "../controllers/paymentController.js";
import { protect } from "../controllers/authController.js";
import {
  handleRazorpayWebhook,
  manualSync,
} from "../controllers/webhookController.js";

const paymentRouter = express.Router();

paymentRouter.post("/webhook", handleRazorpayWebhook);

paymentRouter.post("/create-order", protect, createOrder);
paymentRouter.get("/current-plan", protect, getCurrentPlan);
paymentRouter.get("/history", protect, getPaymentHistory);
paymentRouter.post("/manual-sync", protect, manualSync);

export default paymentRouter;
