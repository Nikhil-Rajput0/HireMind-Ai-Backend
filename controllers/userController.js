import User from "../models/userModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import ApiFeatures from "../utils/apiFeatures.js";

const filterObj = (obj, ...requiredFields) => {
  const reqObj = {};
  Object.keys(obj).forEach((el) => {
    if (requiredFields.includes(el)) reqObj[el] = obj[el];
  });
  return reqObj;
};

export const getAllUsers = async (req, res, next) => {
  const numTotal = await User.countDocuments();
  const features = new ApiFeatures(User.find(), req.query)
    .filter()
    .sort()
    .paginate();

  const user = await features.query
    .populate("interviews")
    .populate("resumes")
    .populate("supports");

  res.status(200).json({
    status: "Success",
    results: user.length,
    numTotal,
    user,
  });
};

export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate("interviews")
    .populate("resumes");

  if (!user) {
    return next(new AppError("There is no user found with these Id", 404));
  }

  res.status(200).json({
    status: "success",
    user,
  });
});

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("These route is not for password", 403));
  }

  const filteredObject = filterObj(req.body, "name", "photo", "credits");

  const user = await User.findByIdAndUpdate(req.user.id, filteredObject, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(203).json({
    status: "success",
    user,
    message: "Data has been changed.",
  });
});

export const updateCredits = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("These route is not for password", 403));
  }

  const filteredObject = filterObj(req.body, "credits");

  const user = await User.findById(req.user.id).select("-password");
  user.credits = filteredObject.credits - 20;
  await user.save({ validateBeforeSave: true });

  res.status(203).json({
    status: "success",
    user,
  });
});

export const logout = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(
      new AppError("You need to logged in to perform these action!", 401),
    );
  }

  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .cookie("accessToken", "Loggedout", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 2 * 1000,
    })
    .cookie("refreshToken", "Loggedout", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 2 * 1000,
    })
    .json({
      status: "success",
      message: "User Logged out",
    });
});
