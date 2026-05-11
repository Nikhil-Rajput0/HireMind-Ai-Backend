import Support from "../models/supportModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const getSupport = catchAsync(async (req, res, next) => {
  const allSupport = await Support.find().populate({
    path: "user",
    select: "name photo email",
  });

  res.status(200).json({
    status: "Success",
    results: allSupport.length,
    message: "Fetching Support Success",
    support: allSupport,
  });
});

export const createSupport = catchAsync(async (req, res, next) => {
  const { subject, problemPhoto, message } = req.body;
  if (!req.body.user) req.body.user = req.user.id;

  const newSupport = await Support.create({
    user: req.body.user,
    subject,
    problemPhoto,
    message,
  });

  res.status(201).json({
    status: "sucess",
    message: "Message sent successfully!",
    support: newSupport,
  });
});
