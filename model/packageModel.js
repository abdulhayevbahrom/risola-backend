const { Schema, model } = require("mongoose");

const packageSchema = new Schema(
  {
    title: { type: String, required: true },
    capacity: { type: Number, required: true },
    min_price: { type: Number, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    leader: [{ type: String, default: "" }],
  },
  { timestamps: true }
);

module.exports = model("packages", packageSchema);
