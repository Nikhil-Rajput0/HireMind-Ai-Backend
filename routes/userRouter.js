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
import { uploadSingleFile } from "../middleware/upload.js";
import { uploadUserPhotoToCloud } from "../middleware/cloudinaryUpload.js";

const userRouter = express.Router();

userRouter.get("/allUsers", getAllUsers);
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
userRouter.patch("/updatePassword", protect, updatePassword);
userRouter.get("/getMe", protect, getMe);

export default userRouter;
