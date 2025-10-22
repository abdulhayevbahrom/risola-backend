const Salary = require("../model/salaryModel");
const Client = require("../model/clientsModel");
const Admin = require("../model/adminModel");
const moment = require("moment-timezone");
const response = require("../utils/response");

module.exports = {
  // 🧾 1️⃣ Oy bo‘yicha umumiy oyliklar tahlili
  async getMonthlySalaries(req, res) {
    try {
      const month = req.query.month || moment().format("YYYY-MM"); // agar berilmasa joriy oy
      const allAdmins = await Admin.find({ isActive: true });

      const result = [];

      for (const admin of allAdmins) {
        let mustPay = 0;
        let alreadyPaid = 0;
        let debt = 0;

        if (admin.role === "agent") {
          // 🔹 Agent uchun hisoblash
          const clients = await Client.find({ agent: admin._id }).populate(
            "package"
          );
          let agentBonus = 0;

          for (const client of clients) {
            const memberCount = client.members.length;
            const baseAmount = memberCount * (client.package?.min_price || 0);
            const paidAmount = client.paymentHistory.reduce(
              (sum, p) => sum + p.amount,
              0
            );
            const profit = paidAmount - baseAmount;
            if (profit > 0) agentBonus += profit;
          }

          mustPay = agentBonus;
        } else {
          // 🔸 Oddiy xodim yoki admin uchun
          mustPay = admin.salary;
        }

        // 🔹 Oyliklar ichidan bu oyda berilganini topamiz
        const existing = await Salary.find({
          admin: admin._id,
          month,
        });

        alreadyPaid = existing.reduce((a, b) => a + b.amount, 0);
        debt = mustPay - alreadyPaid;

        result.push({
          admin: {
            id: admin._id,
            name: `${admin.firstName} ${admin.lastName}`,
            role: admin.role,
            position: admin.position,
          },
          month,
          mustPay,
          alreadyPaid,
          debt: debt < 0 ? 0 : debt,
          paid: alreadyPaid > 0,
        });
      }

      let data = {
        month,
        totalMustPay: result.reduce((a, b) => a + b.mustPay, 0),
        totalPaid: result.reduce((a, b) => a + b.alreadyPaid, 0),
        totalDebt: result.reduce((a, b) => a + b.debt, 0),
        list: result,
      };
      response.success(res, "Muvaffaqiyatli topildi", data);
    } catch (error) {
      response.serverError(res, error.message, error);
    }
  },

  // pay to worker
  async paySalary(req, res) {
    try {
      const { adminId, amount, month, paymentType, currency } = req.body;
      const admin = await Admin.findById(adminId);
      if (!admin) return response.error(res, "Xodim topilmadi");

      let salary = await Salary.create({
        admin: adminId,
        month,
        amount,
        paymentType,
        currency,
      });
      response.success(res, "Muvaffaqiyatli to‘landi", salary);
    } catch (error) {
      response.serverError(res, error.message, error);
    }
  },

  async getAllSalaries(req, res) {
    try {
      let { startDate, endDate } = req.query;
      let filter = {};

      // 🗓 Agar startDate yoki endDate berilmagan bo‘lsa — joriy oyni olish
      if (!startDate || !endDate) {
        const now = new Date();

        // oyning birinchi kuni
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        // oyning oxirgi kuni
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        startDate = firstDay;
        endDate = lastDay;
      } else {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
      }

      filter.createdAt = { $gte: startDate, $lte: endDate };

      const salaries = await Salary.find(filter).populate("admin");

      response.success(res, "Muvaffaqiyatli topildi", salaries);
    } catch (error) {
      response.serverError(res, error.message, error);
    }
  },
};
