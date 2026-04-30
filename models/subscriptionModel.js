import mongoose from "mongoose";

const subscriptionModel = new mongoose.Schema(
  {
    type: String,
    planType: String,
    priceDollar: String,
    price: String,
    quantity: String,
    btnText: String,
    isPopular: Boolean,
  },
  { timestamps: true },
);

const Plan = mongoose.model("Plan", subscriptionModel);

export default Plan;
