import express from "express";
import {
  getAllUsers,
  getMe,
  logout,
  updateCredits,
  updateMe,
} from "../controllers/userController.js";
import {
  forgetPassword,
  login,
  protect,
  resetPassword,
  RestrictTo,
  sendOtp,
  signUp,
  updatePassword,
  verifyOtp,
} from "../controllers/authController.js";
import { uploadSingleFile } from "../middleware/upload.js";
import { uploadUserPhotoToCloud } from "../middleware/cloudinaryUpload.js";

const userRouter = express.Router();

userRouter.route("/sendOtp").post(sendOtp);
userRouter.route("/verifyOtp").post(verifyOtp);
userRouter.route("/signUp").post(signUp);
userRouter.route("/login").post(login);
userRouter.route("/forgetPassword").post(forgetPassword);
userRouter.route("/resetPassword/:token").post(resetPassword);
userRouter.patch(
  "/updateMe",
  protect,
  uploadSingleFile,
  uploadUserPhotoToCloud,
  updateMe,
);

userRouter.get("/allUsers", protect, RestrictTo("admin"), getAllUsers);
userRouter.patch("/updateCredits", protect, updateCredits);
userRouter.patch("/updatePassword", protect, updatePassword);
userRouter.get("/getMe", protect, getMe);
userRouter.patch("/logout", protect, logout);

export default userRouter;
