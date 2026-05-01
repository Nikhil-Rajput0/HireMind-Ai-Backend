import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Plan from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const createOrder = catchAsync(async (req, res, next) => {
  const { planId } = req.body;

  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new AppError("Plan not found", 404));
  }

  // 2. Create order options
  const amount = Math.round(parseFloat(plan.price) * 100); // Convert to paise

  const options = {
    amount: amount,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      userId: req.user.id,
      planId: plan._id.toString(),
      planType: plan.planType, // 'credits', 'subscription', 'lifetime'
      planName: plan.type, // 'Basic', 'Standard', 'Monthly', etc.
      quantity: plan.quantity,
      price: plan.price,
    },
  };

  // 3. Create order with Razorpay
  const order = await razorpay.orders.create(options);

  // 4. Send response
  res.status(200).json({
    status: "success",
    order,
    plan,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

export const getCurrentPlan = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  await user.checkSubscriptionStatus();

  let planInfo = {
    credits: user.credits,
    hasCredits: user.credits > 0,
    hasActiveSubscription: false,
    isLifetime: user.isLifetime,
  };

  if (user.isLifetime) {
    planInfo.hasActiveSubscription = true;
    planInfo.subscriptionType = "lifetime";
  } else if (user.subscription?.isActive) {
    planInfo.hasActiveSubscription = true;
    planInfo.subscriptionType = "subscription";
    planInfo.planName = user.subscription.planName;
    planInfo.startDate = user.subscription.startDate;
    planInfo.expiryDate = user.subscription.expiryDate;
    planInfo.daysLeft = Math.ceil(
      (new Date(user.subscription.expiryDate) - new Date()) /
        (1000 * 60 * 60 * 24),
    );
  }

  res.status(200).json({
    status: "success",
    planInfo,
  });
});

export const getPaymentHistory = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("paymentHistory");

  res.status(200).json({
    status: "success",
    results: user.paymentHistory.length,
    history: user.paymentHistory.reverse(),
  });
});
