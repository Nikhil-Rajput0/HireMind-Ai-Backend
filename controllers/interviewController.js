import Interview from "../models/interviewModel.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllInterviews = catchAsync(async (req, res, next) => {
  const allInterviews = await Interview.find();
  res.status(200).json({
    status: "success",
    result: allInterviews.length,
    data: {
      interview: allInterviews,
    },
  });
});

export const createInterview = catchAsync(async (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  const interview = await Interview.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      interview,
    },
  });
});
