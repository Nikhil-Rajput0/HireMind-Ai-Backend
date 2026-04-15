import User from "../models/userModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const filterObj = (obj, ...requiredFields) => {
  const reqObj = {};
  Object.keys(obj).forEach((el) => {
    if (requiredFields.includes(el)) reqObj[el] = obj[el];
  });
  return reqObj;
};

export const getAllUsers = async (req, res, next) => {
  const user = await User.find();
  res.status(200).json({
    status: "Success",
    results: user.length,
    user,
  });
};

export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

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

  const filteredObject = filterObj(req.body, "name");

  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredObject, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    status: "success",
    updateUser,
    message: "Data has been changed.",
  });
});
