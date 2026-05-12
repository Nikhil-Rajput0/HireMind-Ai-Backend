// models/userModel.js
import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import generateOtp from "../utils/generateOtp.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A user must have user name"],
      minLength: [4, "A userName is greater than 4 character"],
      trim: true,
    },
    credits: {
      type: Number,
      default: 50,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    isVerfied: {
      type: Boolean,
      default: true,
      select: false,
    },
    email: {
      type: String,
      required: [true, "A user Must have email."],
      unique: true,
      validate: [validator.isEmail, "Please Enter valid Email."],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "A user Must have Strong Password."],
      validate: [validator.isStrongPassword],
      minLength: [8, "A password is greater than 8 character"],
      trim: true,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "A user Must have Confirm Password."],
      minLength: [8, "A password is greater than 8 character"],
      trim: true,
      select: false,
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Please Enter the same password as above.",
      },
    },
    photo: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    refreshToken: String,
    changedPasswordAt: Date,
    resetPasswordToken: String,
    resetTokenExpires: Date,

    isBanned: {
      type: Boolean,
      default: false,
    },

    subscription: {
      plan: {
        type: mongoose.Schema.ObjectId,
        ref: "Plan",
      },
      planName: {
        type: String,
      },
      planType: {
        type: String,
        enum: ["subscription", "lifetime"],
      },
      startDate: Date,
      expiryDate: Date,
      isActive: {
        type: Boolean,
        default: false,
      },
      paymentId: String,
      orderId: String,
    },
    isLifetime: {
      type: Boolean,
      default: false,
    },
    paymentHistory: [
      {
        planId: {
          type: mongoose.Schema.ObjectId,
          ref: "Plan",
        },
        planName: String,
        planType: String,
        amount: Number,
        paymentId: String,
        orderId: String,
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

userSchema.virtual("interviews", {
  ref: "Interview",
  foreignField: "user",
  localField: "_id",
});

userSchema.virtual("resumes", {
  ref: "Resume",
  foreignField: "user",
  localField: "_id",
});

userSchema.virtual("supports", {
  ref: "Support",
  foreignField: "User",
  localField: "_id",
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return;

  this.changedPasswordAt = Date.now() - 1000;
});

userSchema.methods.correctPassword = async (clientPassword, password) => {
  return await bcrypt.compare(clientPassword, password);
};

userSchema.methods.changedPasswordAfter = function (JWTIat) {
  if (this.changedPasswordAt) {
    const changedPassword = parseInt(
      this.changedPasswordAt.getTime() / 1000,
      10,
    );
    return JWTIat < changedPassword;
  }

  return false;
};

userSchema.methods.changedPasswordtoken = async function () {
  const resetToken = generateOtp();
  this.resetPasswordToken = resetToken;
  this.resetTokenExpires = Date.now() + 5 * 60 * 1000;

  return resetToken;
};

// NEW METHODS

// Check if user has any access
userSchema.methods.hasAccess = function () {
  // Lifetime access
  if (this.isLifetime) return true;

  // Active subscription
  if (
    this.subscription?.isActive &&
    this.subscription?.expiryDate &&
    new Date(this.subscription.expiryDate) > new Date()
  ) {
    return true;
  }

  // Has credits
  if (this.credits > 0) return true;

  return false;
};

// Check and update subscription status
userSchema.methods.checkSubscriptionStatus = async function () {
  if (
    this.subscription?.expiryDate &&
    new Date(this.subscription.expiryDate) < new Date()
  ) {
    this.subscription.isActive = false;
    // If had unlimited credits from subscription, reset
    if (this.credits > 1000) {
      this.credits = 0;
    }
    await this.save({ validateBeforeSave: false });
    return false;
  }
  return this.subscription?.isActive || false;
};

// Deduct credits
userSchema.methods.deductCredits = async function (amount = 20) {
  // If lifetime, always allow
  if (this.isLifetime) return true;

  // If active subscription, don't deduct
  if (
    this.subscription?.isActive &&
    this.subscription?.expiryDate &&
    new Date(this.subscription.expiryDate) > new Date()
  ) {
    return true;
  }

  // Check if subscription expired
  await this.checkSubscriptionStatus();

  // Deduct from credits
  if (this.credits >= amount) {
    this.credits -= amount;
    await this.save({ validateBeforeSave: false });
    return true;
  }

  return false;
};

const User = mongoose.model("User", userSchema);
export default User;
