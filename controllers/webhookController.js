import crypto from "crypto";
import Plan from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";

export const handleRazorpayWebhook = catchAsync(async (req, res) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Event:", req.body.event);

  // 1. Verify webhook signature
  const signature = req.headers["x-razorpay-signature"];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature) {
    console.error("❌ No signature in webhook");
    return res.status(400).json({ error: "No signature" });
  }

  if (!webhookSecret) {
    console.error("❌ Webhook secret not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  // Verify the signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  console.log("Signature valid:", signature === expectedSignature);

  if (signature !== expectedSignature) {
    console.error("❌ Invalid webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  // 2. Process the event
  const event = req.body.event;

  // Always respond 200 first (Razorpay expects quick response)
  res.status(200).json({ status: "ok" });

  // Process payment.captured event
  if (event === "payment.captured") {
    try {
      const paymentEntity = req.body.payload.payment.entity;

      console.log("=== PAYMENT DETAILS ===");
      console.log("Payment ID:", paymentEntity.id);
      console.log("Order ID:", paymentEntity.order_id);
      console.log("Amount:", paymentEntity.amount);
      console.log("Status:", paymentEntity.status);
      console.log("Notes:", paymentEntity.notes);

      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      // Get user ID and plan ID from order notes
      // We need to fetch the order to get notes
      const order = await razorpay.orders.fetch(orderId);

      const userId = order.notes?.userId;
      const planId = order.notes?.planId;

      console.log("User ID from notes:", userId);
      console.log("Plan ID from notes:", planId);

      if (!userId || !planId) {
        console.error("❌ Missing userId or planId in order notes");
        console.log("Order notes:", order.notes);
        return;
      }

      // Find plan and user
      const plan = await Plan.findById(planId);
      if (!plan) {
        console.error("❌ Plan not found:", planId);
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error("❌ User not found:", userId);
        return;
      }

      console.log("Plan:", plan.type, plan.planType);
      console.log("User:", user.email);

      // Check if payment already processed (prevent duplicates)
      const alreadyProcessed = user.paymentHistory?.some(
        (p) => p.paymentId === paymentId,
      );

      if (alreadyProcessed) {
        console.log("⚠️ Payment already processed:", paymentId);
        return;
      }

      // Add to payment history
      user.paymentHistory.push({
        planId: plan._id,
        planName: plan.type,
        planType: plan.planType,
        amount: parseInt(plan.price),
        paymentId: paymentId,
        orderId: orderId,
      });

      // Update user based on plan type
      let message = "";

      switch (plan.planType) {
        case "credits":
          const creditAmount = parseInt(plan.quantity.match(/\d+/)[0]);
          user.credits = (user.credits || 0) + creditAmount;
          message = `Added ${creditAmount} credits`;
          console.log(
            `✅ Added ${creditAmount} credits. Total: ${user.credits}`,
          );
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
            paymentId: paymentId,
            orderId: orderId,
          };

          user.credits = 999999;
          message = `${plan.type} subscription activated`;
          console.log(`✅ Subscription activated: ${plan.type}`);
          break;

        case "lifetime":
          user.subscription = {
            plan: plan._id,
            planName: plan.type,
            planType: "lifetime",
            startDate: new Date(),
            expiryDate: null,
            isActive: true,
            paymentId: paymentId,
            orderId: orderId,
          };

          user.credits = 999999;
          user.isLifetime = true;
          message = "Lifetime access activated";
          console.log("✅ Lifetime access activated");
          break;
      }

      await user.save({ validateBeforeSave: false });
      console.log("✅ User updated successfully:", message);
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      console.error("Error stack:", error.stack);
      // Don't throw - we already responded 200
    }
  } else {
    console.log("ℹ️ Unhandled event type:", event);
  }
});

// Manual sync endpoint (backup)
export const manualSync = catchAsync(async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: "Payment ID required" });
  }

  try {
    // Fetch payment from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status !== "captured") {
      return res.status(400).json({
        error: "Payment not captured",
        status: payment.status,
      });
    }

    // Fetch order for notes
    const order = await razorpay.orders.fetch(payment.order_id);

    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
      },
      order: {
        id: order.id,
        notes: order.notes,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
