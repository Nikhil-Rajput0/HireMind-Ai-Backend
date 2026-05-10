import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import generateOtp from "../utils/generateOtp.js";
import redis from "../config/redis.js";
import sendOTP from "../utils/sendMail.js";
import { promisify } from "util";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const generateRefreahToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

export const sendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const otp = generateOtp();

  const user = await User.findOne({ email });
  if (user) {
    return next(new AppError("User already exist with these email.", 400));
  }

  if (!email) {
    return next(new AppError("Please Enter your Email to continue.", 401));
  }

  await redis.set(`otp:${email}`, otp, "EX", 300);
  await sendOTP(email, otp);

  res.status(200).json({
    status: "success",
    message: `Your otp is successfully sent on :${email}`,
  });
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const correctOtp = await redis.get(`otp:${email}`);

  if (!correctOtp) {
    return next(new AppError("OTP EXPIRED", 400));
  }

  if (correctOtp.trim() !== String(otp).trim()) {
    return next(new AppError("Invalid otp", 401));
  }

  await redis.del(`otp:${email}`);

  const verifyToken = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(200).json({
    status: "success",
    verifyToken,
  });
});

export const signUp = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, verifyToken } = req.body;

  //  1. check token exists
  if (!verifyToken) {
    return next(new AppError("Verification token missing", 401));
  }

  //  2. verify token safely
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(verifyToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401));
  }

  //  3. match email
  if (decoded.email.trim() !== email.trim()) {
    return next(new AppError("You are not verified.", 401));
  }

  //  4. check existing user
  const alreadyExist = await User.findOne({ email });
  if (alreadyExist) {
    return next(new AppError("User already exists, please login instead", 400));
  }

  //  5. create user
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });

  // 6. generate tokens
  const accessToken = generateAccessToken(newUser._id);
  const refreshToken = generateRefreahToken(newUser._id);

  newUser.refreshToken = refreshToken;
  await newUser.save({ validateBeforeSave: false });

  newUser.password = undefined;

  // 7. send response (ONLY ONCE)
  return res
    .status(201)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000,
      path: "/",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })
    .cookie("isLoggedIn", "true", {
      httpOnly: false,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })
    .json({
      status: "Success",
      accessToken,
      data: {
        user: newUser,
      },
      message: "SignUp success. You are redirecting..",
    });
});

export const login = catchAsync(async (req, res, next) => {
  const validated = loginSchema.parse(req.body);
  const { email, password } = validated;

  if (!email && !password) {
    return next(
      new AppError("Please Enter email and password to continue", 401),
    );
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Please enter correct email or password", 401));
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreahToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",

      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })
    .json({
      status: "success",
      accessToken,
      message: "Login success. You are redirecting...",
    });
});

export const forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("There is no user with these email", 400));
  }

  const resetToken = await user.changedPasswordtoken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendOTP(email, resetToken);
    res.status(200).json({
      status: "success",
      message: "Your token is sent on mail.",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return next(new AppError("There is an error occur during these", 500));
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const resetToken = req.params.token;

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("The otp for reset password is expired", 403));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.resetPasswordToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password changed successfully",
  });
});

export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  }

  if (!token) {
    return next(
      new AppError(
        "You are not logged in. please login to perform these action.",
        401,
      ),
    );
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_REFRESH_SECRET,
  );

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user with these token is no longer exist.", 403),
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed the password.", 401));
  }

  req.user = currentUser;
  next();
});

export const RestrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You are not restricted to perform these action", 401),
      );
    }

    next();
  };
};

export const updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("The current password is wrong.", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  res.status(203).json({
    status: "success",
    message: "Password changed successfylly.",
  });
});
