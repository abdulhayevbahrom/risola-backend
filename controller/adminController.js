const response = require("../utils/response");
const adminsDB = require("../model/adminModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AdminController {
  // 📋 Barcha hodimlar/agentlar/adminlar
  async getAdmins(req, res) {
    try {
      const admins = await adminsDB.find().select("-password");
      if (!admins.length) return response.notFound(res, "Ma’lumot topilmadi");
      response.success(res, "Barcha foydalanuvchilar", admins);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // 🔎 Bitta adminni olish
  async getAdminById(req, res) {
    try {
      const admin = await adminsDB.findById(req.params.id).select("-password");
      if (!admin) return response.notFound(res, "Foydalanuvchi topilmadi");
      response.success(res, "Foydalanuvchi topildi", admin);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // ➕ Yangi foydalanuvchi qo‘shish
  async createAdmin(req, res) {
    try {
      const io = req.app.get("socket");
      const { role, login, password, phone } = req.body;

      // 🧩 Telefon yagona bo‘lishi kerak
      const existingPhone = await adminsDB.findOne({ phone });
      if (existingPhone) {
        return response.error(res, "Bu telefon raqami allaqachon mavjud");
      }

      // 👤 Agar login bo‘lsa — u ham unique bo‘lishi kerak
      if (login) {
        const existingLogin = await adminsDB.findOne({ login });
        if (existingLogin) {
          return response.error(res, "Bu login allaqachon mavjud");
        }
      }

      // 🔐 Parol faqat admin va employee uchun hash qilinadi
      if (["admin", "employee", "kassa"].includes(role) && password) {
        req.body.password = await bcrypt.hash(password, 10);
      } else {
        delete req.body.password;
        delete req.body.login;
      }

      const admin = await adminsDB.create(req.body);

      io.emit("new_admin", admin);
      response.created(res, "Ma'lumot saqlandi", admin);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // ✏️ Yangilash
  async updateAdmin(req, res) {
    try {
      const io = req.app.get("socket");
      const { login, password, phone, role } = req.body;

      // telefonni o‘zgartirayotganda tekshirish
      if (phone) {
        const phoneExists = await adminsDB.findOne({
          phone,
          _id: { $ne: req.params.id },
        });
        if (phoneExists)
          return response.error(res, "Bu telefon raqami allaqachon mavjud");
      }

      // loginni o‘zgartirayotganda tekshirish
      if (login) {
        const loginExists = await adminsDB.findOne({
          login,
          _id: { $ne: req.params.id },
        });
        if (loginExists)
          return response.error(res, "Bu login allaqachon mavjud");
      }

      const updateData = { ...req.body };

      // faqat admin va employee bo‘lsa parolni yangilash
      if (["admin", "employee"].includes(role) && password) {
        updateData.password = await bcrypt.hash(password, 10);
      } else {
        delete updateData.password;
        delete updateData.login;
      }

      const updatedAdmin = await adminsDB.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedAdmin)
        return response.error(res, "Foydalanuvchi yangilanmadi");

      io.emit("admin_updated", updatedAdmin);
      response.success(res, "Foydalanuvchi yangilandi", updatedAdmin);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // 🗑️ O‘chirish
  async deleteAdmin(req, res) {
    try {
      const io = req.app.get("socket");
      const admin = await adminsDB.findByIdAndDelete(req.params.id);
      if (!admin) return response.error(res, "Foydalanuvchi topilmadi");

      io.emit("admin_deleted", req.params.id);
      response.success(res, "Foydalanuvchi o‘chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // 🔐 Login faqat admin va employee uchun
  async login(req, res) {
    try {
      const { login, password } = req.body;
      const admin = await adminsDB.findOne({ login });

      if (!admin)
        return response.error(res, "Login yoki parol noto‘g‘ri (topilmadi)");

      if (admin.role === "agent")
        return response.error(res, "Ijtimoiy hodimlar tizimga kira olmaydi");

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return response.error(res, "Login yoki parol noto‘g‘ri");

      const token = jwt.sign(
        { id: admin._id, role: admin.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1w" }
      );

      response.success(res, "Kirish muvaffaqiyatli", {
        admin,
        token,
      });
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new AdminController();
