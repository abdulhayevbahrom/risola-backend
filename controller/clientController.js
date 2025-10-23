const response = require("../utils/response");
const Client = require("../model/clientsModel");

class ClientController {
  async getAllClients(req, res) {
    try {
      const clients = await Client.find({})
        .populate("package")
        .populate("agent")
        .sort({ createdAt: -1 });
      return response.success(res, "Klientlar ro'yxati", clients);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async createClient(req, res) {
    try {
      const newClient = await Client.create(req.body);
      if (!newClient) return response.error(res, "Mijoz saqlanmadi");
      return response.created(res, "Mijoz saqlandi", newClient);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async deleteClient(req, res) {
    try {
      const deletedClient = await Client.findByIdAndDelete(req.params.id);
      if (!deletedClient) return response.error(res, "Mijoz topilmadi");
      return response.success(res, "Mijoz o'chirildi");
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async updateClient(req, res) {
    try {
      const updatedClient = await Client.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );
      if (!updatedClient) return response.error(res, "Mijoz topilmadi");
      return response.success(res, "Mijoz yangilandi", updatedClient);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  // delete member
  async deleteMember(req, res) {
    try {
      let { id, member_id } = req.params;
      const client = await Client.findById(id);
      if (!client) return response.error(res, "Mijoz topilmadi");

      client.members = client.members.filter((m) => m._id != member_id);
      const updatedClient = await client.save();
      return response.success(res, "Mijoz yangilandi", updatedClient);
    } catch (error) {
      response.serverError(res, error.message, error);
    }
  }

  async getClientbyPackage(req, res) {
    try {
      const clients = await Client.find({ package: req.params.id })
        // kerak bo‘lsa, shu joyda ochib qo‘yish mumkin
        .populate("package")
        .populate("agent")
        .lean(); // => toza JSON obyekt sifatida qaytaradi

      return response.success(res, "Mijozlar ro'yxati", clients);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async getDebtors(req, res) {
    try {
      const debtors = await Client.aggregate([
        // 1️⃣ Qarzini hisoblash (totalPrice - to‘langan summa)
        {
          $addFields: {
            paidAmount: { $sum: "$paymentHistory.amount" },
          },
        },
        {
          $addFields: {
            debt: { $subtract: ["$totalPrice", "$paidAmount"] },
          },
        },
        // 2️⃣ Faqat qarzi borlarni olish
        {
          $match: {
            debt: { $gt: 0 },
          },
        },
        {
          $lookup: {
            from: "packages", // kolleksiya nomi
            localField: "package", // Client modeldagi field
            foreignField: "_id", // packages dagi asosiy id
            as: "package", // yangi field nomi
          },
        },
        // 4️⃣ Paketni array emas, bitta obyekt qilish
        {
          $unwind: {
            path: "$package",
            preserveNullAndEmptyArrays: true,
          },
        },
        // 3️⃣ Kerakli maydonlarni qaytarish (ixtiyoriy)
        {
          $project: {
            groupName: 1,
            members: 1,
            pricePerOne: 1,
            totalPrice: 1,
            address: 1,
            paidAmount: 1,
            package: 1,
            paymentHistory: 1,
            debt: 1,
            target: 1,
            agent: 1,
            createdAt: 1,
          },
        },
      ]);

      return response.success(res, "Qarzli mijozlar", debtors);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async payTotalClient(req, res) {
    try {
      const { id } = req.params;
      const { amount, paymentType } = req.body;

      if (!amount || amount <= 0)
        return response.error(res, "To‘lov summasi noto‘g‘ri");

      // 1️⃣ Mijozni olish
      const client = await Client.findById(id);
      if (!client) return response.error(res, "Mijoz topilmadi");

      // 2️⃣ Yangi to‘lovni qo‘shish
      client.paymentHistory.push({
        amount,
        paymentType: paymentType || "naqd",
        date: new Date(),
      });

      // 3️⃣ To‘langan summani hisoblash
      const totalPaid = client.paymentHistory.reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );

      // 4️⃣ Holatni yangilash
      client.isPaid = totalPaid >= client.totalPrice;

      // 5️⃣ Mijozni saqlash
      await client.save();

      return response.success(res, "To‘lov muvaffaqiyatli qo‘shildi", {
        clientId: client._id,
        totalPaid,
        totalPrice: client.totalPrice,
        remainingDebt: Math.max(client.totalPrice - totalPaid, 0),
        isPaid: client.isPaid,
      });
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  async getUniqueAddresses(req, res) {
    try {
      const addresses = await Client.aggregate([
        {
          $match: {
            "address.region": { $exists: true, $ne: "" },
            "address.district": { $exists: true, $ne: "" },
            isActive: true, // faqat faol mijozlar
          },
        },
        {
          $group: {
            _id: null,
            regions: { $addToSet: "$address.region" },
            districts: { $addToSet: "$address.district" },
          },
        },
        {
          $project: {
            _id: 0,
            regions: 1,
            districts: 1,
          },
        },
      ]);

      const result =
        addresses.length > 0 ? addresses[0] : { regions: [], districts: [] };

      response.success(res, "Manzillar topildi", result);
    } catch (error) {
      response.serverError(res, error.message, error);
    }
  }

  // async getPaymentsByDateRange(req, res) {
  //   try {
  //     const start = new Date();
  //     start.setHours(0, 0, 0, 0);
  //     const end = new Date();
  //     end.setHours(23, 59, 59, 999);

  //     const payments = await Client.aggregate([
  //       // 1️⃣ To'lov tarixini yoyamiz
  //       { $unwind: "$paymentHistory" },

  //       // 2️⃣ Faqat ikki sana oralig‘idagi to‘lovlarni olamiz
  //       {
  //         $match: {
  //           "paymentHistory.date": { $gte: start, $lte: end },
  //         },
  //       },

  //       // 3️⃣ Ma’lumotni to‘lovlar bo‘yicha guruhlaymiz
  //       {
  //         $group: {
  //           _id: "$_id",
  //           groupName: { $first: "$groupName" },
  //           totalPaid: { $sum: "$paymentHistory.amount" },
  //           payments: {
  //             $push: {
  //               date: "$paymentHistory.date",
  //               amount: "$paymentHistory.amount",
  //               paymentType: "$paymentHistory.paymentType",
  //             },
  //           },
  //         },
  //       },

  //       // 4️⃣ Istasangiz agent yoki boshqa ma’lumotni ham join qilamiz
  //       {
  //         $lookup: {
  //           from: "admins",
  //           localField: "agent",
  //           foreignField: "_id",
  //           as: "agent",
  //         },
  //       },
  //       {
  //         $unwind: { path: "$agent", preserveNullAndEmptyArrays: true },
  //       },

  //       // 5️⃣ So‘ngra tartib bilan chiqaramiz
  //       { $sort: { totalPaid: -1 } },
  //     ]);

  //     res.json({
  //       success: true,
  //       count: payments.length,
  //       payments,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: "Serverda xatolik yuz berdi", error });
  //   }
  // }
  async getPaymentsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Agar sanalar berilmagan bo'lsa, xato qaytaramiz
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "startDate va endDate parametrlari majburiy!",
        });
      }

      // Sanalarni to'g'ri formatga o'tkazamiz
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Sana validatsiyasi
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Noto'g'ri sana formati! YYYY-MM-DD formatida yuboring.",
        });
      }

      const payments = await Client.aggregate([
        // 1️⃣ To'lov tarixini yoyamiz
        { $unwind: "$paymentHistory" },

        // 2️⃣ Faqat ikki sana oralig'idagi to'lovlarni olamiz
        {
          $match: {
            "paymentHistory.date": { $gte: start, $lte: end },
          },
        },

        // 3️⃣ Ma'lumotni to'lovlar bo'yicha guruhlaymiz
        {
          $group: {
            _id: "$_id",
            groupName: { $first: "$groupName" },
            fullName: { $first: "$fullName" }, // Individual mijozlar uchun
            totalPaid: { $sum: "$paymentHistory.amount" },
            payments: {
              $push: {
                date: "$paymentHistory.date",
                amount: "$paymentHistory.amount",
                paymentType: "$paymentHistory.paymentType",
              },
            },
          },
        },

        // 4️⃣ Agent ma'lumotini join qilamiz
        {
          $lookup: {
            from: "admins",
            localField: "agent",
            foreignField: "_id",
            as: "agent",
          },
        },
        {
          $unwind: { path: "$agent", preserveNullAndEmptyArrays: true },
        },

        // 5️⃣ To'lov sanasi bo'yicha tartiblaymiz
        { $sort: { "payments.date": -1 } },
      ]);

      res.json({
        success: true,
        count: payments.length,
        payments,
      });
    } catch (error) {
      console.error("getPaymentsByDateRange error:", error);
      res.status(500).json({
        success: false,
        message: "Serverda xatolik yuz berdi",
        error: error.message,
      });
    }
  }
}

module.exports = new ClientController();
