const { Schema, model } = require("mongoose");

const salarySchema = new Schema(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "Admins",
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentType: {
      type: String,
      required: true,
      enum: ["naqd", "karta"],
    },
    currency: { type: String, enum: ["UZS", "USD"], default: "UZS" }, // 🆕
  },
  { timestamps: true }
);

module.exports = model("salaries", salarySchema);
