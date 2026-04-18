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
      select: false,
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
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

userSchema.virtual("interviews", {
  ref: "Interview",
  foreignField: "user",
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

const User = mongoose.model("User", userSchema);
export default User;
