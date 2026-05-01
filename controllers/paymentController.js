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

// Verify payment
export const verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } =
    req.body;

  console.log("=== VERIFY PAYMENT ===");
  console.log("Order ID:", razorpay_order_id);
  console.log("Payment ID:", razorpay_payment_id);
  console.log("Plan ID:", planId);

  // 1. Verify signature
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  console.log("Signature valid:", razorpay_signature === expectedSign);

  if (razorpay_signature !== expectedSign) {
    return next(new AppError("Invalid payment signature", 400));
  }

  // 2. Fetch order details from Razorpay to get user ID
  const order = await razorpay.orders.fetch(razorpay_order_id);
  const userId = order.notes.userId;

  console.log("User ID from order:", userId);

  if (!userId) {
    return next(new AppError("User ID not found in order", 400));
  }

  // 3. Get plan and user
  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new AppError("Plan not found", 404));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  console.log("Plan:", plan.type, plan.planType);
  console.log("User:", user.email);

  // 4. Add to payment history
  user.paymentHistory.push({
    planId: plan._id,
    planName: plan.type,
    planType: plan.planType,
    amount: parseInt(plan.price),
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });

  // 5. Handle based on plan type
  let message = "";

  switch (plan.planType) {
    case "credits":
      const creditAmount = parseInt(plan.quantity.match(/\d+/)[0]);
      user.credits += creditAmount;
      message = `✅ Successfully added ${creditAmount} credits! Total credits: ${user.credits}`;
      break;

    case "subscription":
      const now = new Date();
      let expiryDate;

      if (plan.type === "Monthly") {
        expiryDate = new Date(now.setMonth(now.getMonth() + 1));
      } else if (plan.type === "Quarterly") {
        expiryDate = new Date(now.setMonth(now.getMonth() + 3));
      } else if (plan.type === "Yearly") {
        expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      }

      user.subscription = {
        plan: plan._id,
        planName: plan.type,
        planType: "subscription",
        startDate: new Date(),
        expiryDate: expiryDate,
        isActive: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      };

      user.credits = 999999; // Unlimited during subscription
      message = `🎉 ${plan.type} subscription activated! Valid till ${expiryDate.toLocaleDateString()}`;
      break;

    case "lifetime":
      user.subscription = {
        plan: plan._id,
        planName: plan.type,
        planType: "lifetime",
        startDate: new Date(),
        expiryDate: null,
        isActive: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      };

      user.credits = 999999;
      user.isLifetime = true;
      message =
        "👑 Lifetime access activated! Enjoy unlimited interviews forever!";
      break;

    default:
      return next(new AppError("Invalid plan type", 400));
  }

  // 6. Save user
  await user.save({ validateBeforeSave: false });

  console.log("✅ Payment verified and user updated");

  // 7. Send success response
  res.status(200).json({
    status: "success",
    message,
    data: {
      credits: user.credits,
      subscription: user.subscription,
      isLifetime: user.isLifetime,
    },
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
