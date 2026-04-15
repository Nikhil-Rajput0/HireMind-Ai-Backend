import express from "express";
import { getAllUsers, getMe, updateMe } from "../controllers/userController.js";
import {
  forgetPassword,
  login,
  protect,
  resetPassword,
  sendOtp,
  signUp,
  updatePassword,
  verifyOtp,
} from "../controllers/authController.js";

let userRouter = express.Router();

userRouter.route("/sendOtp").post(sendOtp);
userRouter.route("/verifyOtp").post(verifyOtp);
userRouter.route("/signUp").post(signUp);
userRouter.route("/login").post(login);
userRouter.route("/forgetPassword").post(forgetPassword);
userRouter.route("/resetPassword/:token").post(resetPassword);
userRouter.patch("/updateMe", protect, updateMe);
userRouter.patch("/updatePassword", protect, updatePassword);
userRouter.get("/getMe", protect, getMe);

export default userRouter;
