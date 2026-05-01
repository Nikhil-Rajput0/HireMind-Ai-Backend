import express from "express";
import {
  createOrder,
  verifyPayment,
  getCurrentPlan,
  getPaymentHistory,
} from "../controllers/paymentController.js";
import { protect } from "../controllers/authController.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", protect, createOrder);
paymentRouter.post("/verify-payment", verifyPayment);
paymentRouter.get("/current-plan", protect, getCurrentPlan);
paymentRouter.get("/history", protect, getPaymentHistory);

export default paymentRouter;
