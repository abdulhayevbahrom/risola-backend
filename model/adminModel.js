const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    login: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "agent", "employee", "kassa"],
      required: true,
    },
    position: {
      type: String,
      trim: true,
      default: "", // masalan: "Bosh hisobchi", "Operator", "HR"
    },
    address: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    permissions: {
      type: Array,
      default: [],
    },
    leader: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🔒 Validatsiya – agar role "admin" yoki "employee" bo‘lsa login & password majburiy
AdminSchema.pre("validate", function (next) {
  if (["admin", "employee"].includes(this.role)) {
    if (!this.login || !this.password) {
      return next(
        new Error("Admin yoki xodim uchun login va parol talab qilinadi")
      );
    }
  }
  next();
});

module.exports = mongoose.model("Admins", AdminSchema);
