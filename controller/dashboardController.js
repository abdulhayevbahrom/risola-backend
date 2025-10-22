const response = require("../utils/response");
const Client = require("../model/clientsModel");
const Expense = require("../model/expenseModel");
const Salary = require("../model/salaryModel");

const moment = require("moment");

class DashboardController {
  async getDashboard(req, res) {
    try {
      let { month } = req.query; // masalan: 2025-10
      let startDate, endDate;

      // 🗓 Oyni aniqlash
      if (month) {
        const [year, mon] = month.split("-").map(Number);
        startDate = new Date(year, mon - 1, 1, 0, 0, 0);
        endDate = new Date(year, mon, 0, 23, 59, 59, 999);
      } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      }

      const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

      // 🔹 1️⃣ Sotuvlar
      const salesAgg = await Client.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSalesCount: { $sum: 1 },
            totalSalesPrice: { $sum: "$totalPrice" },
          },
        },
      ]);

      // 🔹 2️⃣ Xarajatlar (valyuta bo‘yicha)
      const expenseAgg = await Expense.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$currency",
            totalExpensesPrice: { $sum: "$amount" },
          },
        },
      ]);

      const expensesByCurrency = expenseAgg.reduce((acc, curr) => {
        acc[curr._id] = curr.totalExpensesPrice;
        return acc;
      }, {});

      // 🔹 3️⃣ Oylik maoshlar
      const salaryAgg = await Salary.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      // 🔹 4️⃣ Parallel ishlaydigan statistikalar
      const [agentStats, targetStats, regionStats, districtStats] =
        await Promise.all([
          // 🔸 Agentlar bo‘yicha
          Client.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: "$agent",
                totalSalesCount: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "admins",
                localField: "_id",
                foreignField: "_id",
                as: "agentInfo",
              },
            },
            {
              $project: {
                _id: 0,
                agent_id: "$_id",
                name: {
                  $concat: [
                    {
                      $ifNull: [
                        { $arrayElemAt: ["$agentInfo.firstName", 0] },
                        "",
                      ],
                    },
                    " ",
                    {
                      $ifNull: [
                        { $arrayElemAt: ["$agentInfo.lastName", 0] },
                        "",
                      ],
                    },
                  ],
                },
                totalSalesCount: 1,
              },
            },
          ]),

          // 🔸 Targetlar bo‘yicha
          Client.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: "$target",
                totalSalesCount: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                target: "$_id",
                totalSalesCount: 1,
              },
            },
          ]),

          // 🔸 Viloyatlar bo‘yicha
          Client.aggregate([
            {
              $match: {
                ...dateFilter,
                "address.region": { $exists: true, $ne: "" },
              },
            },
            {
              $group: {
                _id: "$address.region",
                totalClients: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                region: "$_id",
                totalClients: 1,
              },
            },
            { $sort: { totalClients: -1 } },
          ]),

          // 🔸 Tumanlar bo‘yicha
          Client.aggregate([
            {
              $match: {
                ...dateFilter,
                "address.district": { $exists: true, $ne: "" },
              },
            },
            {
              $group: {
                _id: "$address.district",
                totalClients: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                district: "$_id",
                totalClients: 1,
              },
            },
            { $sort: { totalClients: -1 } },
          ]),
        ]);

      // 📊 Natijalar
      const totalSalesCount = salesAgg[0]?.totalSalesCount || 0;
      const totalSalesPrice = salesAgg[0]?.totalSalesPrice || 0;

      const data = {
        totalSalesCount,
        totalSalesPrice,
        totalExpensesPrice: expensesByCurrency,
        givenSalary: salaryAgg[0]?.total || 0,
        agentStats,
        targetStats,
        regionStats,
        districtStats,
      };

      response.success(res, "Dashboard ma'lumotlari topildi", data);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // get one days info
  async getKassaInfo(req, res) {
    try {
      let startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      let endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      let todaysExpenses = await Expense.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: "$currency",
            total: { $sum: "$amount" },
          },
        },
      ]);

      let todaysExpensesByCurrency = todaysExpenses.reduce((acc, curr) => {
        acc[curr._id] = curr.total;
        return acc;
      }, {});

      const todaysPayments = await Client.aggregate([
        { $unwind: "$paymentHistory" }, // har bir to‘lovni alohida hujjatga ajratamiz
        {
          $match: {
            "paymentHistory.date": { $gte: startOfDay, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$paymentHistory.amount" },
          },
        },
      ]);

      const totalDebtAgg = await Client.aggregate([
        {
          $project: {
            totalPrice: 1,
            totalPaid: { $sum: "$paymentHistory.amount" }, // har bir mijoz bo‘yicha to‘langan summa
          },
        },
        {
          $project: {
            debt: { $subtract: ["$totalPrice", "$totalPaid"] }, // qarz = umumiy - to‘langan
          },
        },
        {
          $group: {
            _id: null,
            totalDebt: { $sum: "$debt" }, // barcha mijozlar qarzi
          },
        },
      ]);

      let data = {
        todaysExpensesByCurrency,
        todaysPayments: todaysPayments[0]?.totalAmount || 0,
        totalDebt: totalDebtAgg[0]?.totalDebt || 0,
      };
      response.success(res, "Kassa ma'lumotlari topildi", data);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new DashboardController();
