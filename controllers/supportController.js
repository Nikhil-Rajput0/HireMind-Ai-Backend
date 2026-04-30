import Support from "../models/supportModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const getSupport = catchAsync(async (req, res, next) => {
  const allSupport = await Support.find();

  res.status(200).json({
    status: "Success",
    message: "Fetching Support Success",
    support: allSupport,
  });
});

export const createSupport = catchAsync(async (req, res, next) => {
  const { name, email, phone, message } = req.body;

  if (!name && !email && !phone && !message) {
    return next(new AppError("All Fields are required", 400));
  }

  const newSupport = await Support.create({
    name,
    email,
    phone,
    message,
  });

  res.status(201).json({
    status: "sucess",
    message: "Message sent successfully!",
    support: newSupport,
  });
});
