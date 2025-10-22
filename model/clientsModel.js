const { Schema, model } = require("mongoose");

const clientsSchema = new Schema(
  {
    package: {
      type: Schema.Types.ObjectId,
      ref: "packages",
    },

    groupName: {
      type: String,
      trim: true,
    },

    members: [
      {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        middleName: { type: String, trim: true },
        birthDate: { type: Date, required: true },
        idNumber: { type: String, trim: true },
        phone: { type: Array, required: true },
        idNumberExpiryDate: { type: Date, required: true },
      },
    ],

    pricePerOne: { type: Number, required: true },
    // to‘lov bo‘yicha ma’lumotlar
    totalPrice: { type: Number, required: true }, // umumiy to‘lov
    paymentHistory: [
      {
        date: { type: Date, required: true, default: Date.now },
        amount: { type: Number, required: true },
        paymentType: {
          type: String,
          enum: ["naqd", "karta"],
          default: "naqd",
        },
      },
    ],
    isPaid: { type: Boolean, default: false },

    address: {
      region: { type: String, trim: true },
      district: { type: String, trim: true },
    },
    target: { type: String, trim: true, required: true },
    agent: { type: Schema.Types.ObjectId, ref: "Admins" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model("clients", clientsSchema);
