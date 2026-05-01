import express from "express";
import {
  createOrder,
  verifyPayment,
  getCurrentPlan,
  getPaymentHistory,
} from "../controllers/paymentController.js";
import { protect } from "../controllers/authController.js";

const paymentRouter = express.Router();

paymentRouter.use(protect);

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify-payment", verifyPayment);
paymentRouter.get("/current-plan", getCurrentPlan);
paymentRouter.get("/history", getPaymentHistory);

export default paymentRouter;
