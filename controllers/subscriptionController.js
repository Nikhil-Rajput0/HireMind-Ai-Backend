import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Plan from "../models/subscriptionModel.js";

export const getSubscription = catchAsync(async (req, res, next) => {
  const plans = await Plan.find();

  if (!plans) {
    return next(new AppError("There is no plan in databse", 404));
  }

  res.status(200).json({
    status: "success",
    result: plans.length,
    plan: plans,
  });
});

export const createSubscription = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "You are not allowed to perform these action.",
  });

  // const { type, planType, priceDollar, price, quantity, btnText, isPopular } =
  //   req.body;

  // const newPlan = await Plan.create({
  //   type,
  //   planType,
  //   priceDollar,
  //   price,
  //   quantity,
  //   btnText,
  //   isPopular,
  // });

  // res.status(201).json({
  //   status: "Success",
  //   plan: newPlan,
  // });
});
