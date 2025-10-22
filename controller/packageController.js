const response = require("../utils/response");
const Package = require("../model/packageModel");

class PackageController {
  async getAllPackages(req, res) {
    try {
      let { status, startDate, endDate } = req.query;

      // 🔍 Filtrni tayyorlash
      let matchFilter = {};
      if (status) matchFilter.status = status;
      if (startDate || endDate) {
        matchFilter.createdAt = {};
        if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
        if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
      }

      // 🔧 Aggregation pipeline
      const packages = await Package.aggregate([
        { $match: matchFilter }, // Filtrlash

        // Paketga birikkan clientlarni qo‘shish
        {
          $lookup: {
            from: "clients",
            localField: "_id",
            foreignField: "package",
            as: "clients",
          },
        },

        // Har bir paket uchun jami odamlar sonini hisoblash
        {
          $addFields: {
            taken: {
              $sum: {
                $map: {
                  input: "$clients",
                  as: "client",
                  in: { $size: "$$client.members" },
                },
              },
            },
          },
        },

        // Bo‘sh joyni hisoblash
        {
          $addFields: {
            available: { $subtract: ["$capacity", "$taken"] },
          },
        },
        // Faqat kerakli maydonlarni tanlash
        {
          $project: {
            title: 1,
            capacity: 1,
            taken: 1,
            available: 1,
            startDate: 1,
            endDate: 1,
            isActive: 1,
            leader: 1,
            createdAt: 1,
            updatedAt: 1,
            min_price: 1,
          },
        },
        { $sort: { createdAt: -1 } }, // eng so‘nggi paketlar birinchi chiqadi
      ]);

      if (!packages.length)
        return response.notFound(res, "Paket topilmadi", packages);

      response.success(res, "Paket topildi", packages);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getPackageById(req, res) {
    try {
      const new_package = await Package.findById(req.params.id);
      if (!new_package) return response.notFound(res, "Paket topilmadi");
      response.success(res, "Paket topildi", new_package);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // create
  async createPackage(req, res) {
    try {
      const new_package = await Package.create(req.body);
      if (!new_package) return response.error(res, "Paket saqlanmadi");
      response.created(res, "Paket muvaffaqiyatli saqlandi", new_package);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // delete
  async deletePackage(req, res) {
    try {
      const deleted_package = await Package.findByIdAndDelete(req.params.id);
      if (!deleted_package) return response.error(res, "Paket topilmadi");
      response.success(res, "Paket o‘chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // update
  async updatePackage(req, res) {
    try {
      const new_package = await Package.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );
      if (!new_package) return response.error(res, "Paket topilmadi");
      response.success(res, "Paket yangilandi", new_package);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async getActivePackages(req, res) {
    try {
      const packagesWithCapacity = await Package.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $lookup: {
            from: "clients",
            let: { packageId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$package", "$$packageId"] },
                },
              },
              {
                $project: {
                  membersCount: { $size: "$members" },
                },
              },
            ],
            as: "clients",
          },
        },
        {
          $addFields: {
            totalBooked: { $sum: "$clients.membersCount" },
          },
        },
        {
          $addFields: {
            availableCapacity: { $subtract: ["$capacity", "$totalBooked"] },
            isFull: {
              $lte: [{ $subtract: ["$capacity", "$totalBooked"] }, 0],
            },
            capacityPercentage: {
              $multiply: [
                { $divide: [{ $ifNull: ["$totalBooked", 0] }, "$capacity"] },
                100,
              ],
            },
          },
        },
        {
          $project: { clients: 0 },
        },
        {
          $match: {
            availableCapacity: { $gt: 0 },
          },
        },
      ]);
      response.success(res, "Faol paketlar topildi", packagesWithCapacity);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  async deactivateOldPackages() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)); // 00:00:00
      const endOfToday = new Date(today.setHours(23, 59, 59, 999)); // 23:59:59

      // 🧩 startDate bugungi kundan kichik yoki teng bo'lgan paketlarni topamiz
      const result = await Package.updateMany(
        { startDate: { $lte: endOfToday }, isActive: true },
        { $set: { isActive: false } }
      );
    } catch (err) {
      console.error("❌ Paketlarni yangilashda xatolik:", err.message);
    }
  }
}

module.exports = new PackageController();
