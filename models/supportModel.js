import mongoose from "mongoose";
import validator from "validator";

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Your Name is required"],
      minLength: [4, "Your name must be greater than 4 character."],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Your Email is required"],
      trim: true,
      validate: [validator.isEmail, "Please Enter correct Email."],
    },

    phone: {
      type: String,
      required: [true, "Your number is required"],
      trim: true,
      max: [12, "A number is only 12 numbers long."],
      min: [10, "A number must be greater than 10 numbers."],
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minLength: [4, "A message has minimum 4 characters."],
    },
  },
  { timestamps: true },
);

const Support = mongoose.model("Support", supportSchema);

export default Support;
