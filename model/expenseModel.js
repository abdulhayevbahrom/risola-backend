const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["kirim", "chiqim"],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["naqt", "karta"],
    },
    currency: {
      type: String,
      required: true,
      enum: ["UZS", "USD"],
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admins",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model("Expense", expenseSchema);
module.exports = Expense;
