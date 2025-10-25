const { Schema, model } = require("mongoose");

const reservedSchema = new Schema({
  agent: { type: Schema.Types.ObjectId, ref: "Admins", required: true },
  reservedCount: { type: Number, required: true }, // qancha joy bron qilingan
  createdAt: { type: Date, default: Date.now },
});

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
    reservations: [reservedSchema],
  },
  { timestamps: true }
);

module.exports = model("packages", packageSchema);
