const response = require("../utils/response");
const Package = require("../model/packageModel");
const Clients = require("../model/clientsModel");

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

  // async getActivePackages(req, res) {
  //   try {
  //     const packagesWithCapacity = await Package.aggregate([
  //       {
  //         $match: {
  //           isActive: true,
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: "clients",
  //           let: { packageId: "$_id" },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: { $eq: ["$package", "$$packageId"] },
  //               },
  //             },
  //             {
  //               $project: {
  //                 membersCount: { $size: "$members" },
  //               },
  //             },
  //           ],
  //           as: "clients",
  //         },
  //       },
  //       {
  //         $addFields: {
  //           totalBooked: { $sum: "$clients.membersCount" },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           availableCapacity: { $subtract: ["$capacity", "$totalBooked"] },
  //           isFull: {
  //             $lte: [{ $subtract: ["$capacity", "$totalBooked"] }, 0],
  //           },
  //           capacityPercentage: {
  //             $multiply: [
  //               { $divide: [{ $ifNull: ["$totalBooked", 0] }, "$capacity"] },
  //               100,
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $project: { clients: 0 },
  //       },
  //       {
  //         $match: {
  //           availableCapacity: { $gt: 0 },
  //         },
  //       },
  //       // 🔽 Adminlarni olish (faqat kerakli maydonlar)
  //       {
  //         $lookup: {
  //           from: "admins",
  //           localField: "reservations.agent",
  //           foreignField: "_id",
  //           as: "reservationAgents",
  //           pipeline: [
  //             {
  //               $project: {
  //                 firstName: 1,
  //                 lastName: 1,
  //                 phone: 1,
  //               },
  //             },
  //           ],
  //         },
  //       },
  //       {
  //         $addFields: {
  //           reservations: {
  //             $map: {
  //               input: "$reservations",
  //               as: "res",
  //               in: {
  //                 $mergeObjects: [
  //                   "$$res",
  //                   {
  //                     agent: {
  //                       $arrayElemAt: [
  //                         {
  //                           $filter: {
  //                             input: "$reservationAgents",
  //                             as: "adm",
  //                             cond: { $eq: ["$$adm._id", "$$res.agent"] },
  //                           },
  //                         },
  //                         0,
  //                       ],
  //                     },
  //                   },
  //                 ],
  //               },
  //             },
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           reservationAgents: 0, // vaqtinchalik maydonni olib tashlaymiz
  //         },
  //       },
  //     ]);
  //     response.success(res, "Faol paketlar topildi", packagesWithCapacity);
  //   } catch (err) {
  //     response.serverError(res, err.message, err);
  //   }
  // }
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
          // 💡 totalBooked (clientlar orqali)
          $addFields: {
            totalBooked: { $sum: "$clients.membersCount" },
          },
        },
        {
          // 💡 totalReserved (reservations orqali)
          $addFields: {
            totalReserved: {
              $sum: {
                $map: {
                  input: "$reservations",
                  as: "r",
                  in: "$$r.reservedCount",
                },
              },
            },
          },
        },
        {
          // 💡 availableCapacity = capacity - (totalBooked + totalReserved)
          $addFields: {
            availableCapacity: {
              $subtract: [
                "$capacity",
                {
                  $add: [
                    { $ifNull: ["$totalBooked", 0] },
                    { $ifNull: ["$totalReserved", 0] },
                  ],
                },
              ],
            },
            isFull: {
              $lte: [
                {
                  $subtract: [
                    "$capacity",
                    {
                      $add: [
                        { $ifNull: ["$totalBooked", 0] },
                        { $ifNull: ["$totalReserved", 0] },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
            capacityPercentage: {
              $multiply: [
                {
                  $divide: [
                    {
                      $add: [
                        { $ifNull: ["$totalBooked", 0] },
                        { $ifNull: ["$totalReserved", 0] },
                      ],
                    },
                    "$capacity",
                  ],
                },
                100,
              ],
            },
          },
        },
        {
          $project: { clients: 0 },
        },
        {
          // faqat bo'sh joy bor paketlarni olish
          $match: {
            availableCapacity: { $gt: 0 },
          },
        },
        {
          // 🔽 Adminlarni olish (faqat kerakli maydonlar)
          $lookup: {
            from: "admins",
            localField: "reservations.agent",
            foreignField: "_id",
            as: "reservationAgents",
            pipeline: [
              {
                $project: {
                  firstName: 1,
                  lastName: 1,
                  phone: 1,
                },
              },
            ],
          },
        },
        {
          // 🔁 reservationlarga adminlarni biriktiramiz
          $addFields: {
            reservations: {
              $map: {
                input: "$reservations",
                as: "res",
                in: {
                  $mergeObjects: [
                    "$$res",
                    {
                      agent: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$reservationAgents",
                              as: "adm",
                              cond: { $eq: ["$$adm._id", "$$res.agent"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            reservationAgents: 0,
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

  // bron qilish
  async reservePackage(req, res) {
    try {
      const { packageId, agentId, reservedCount } = req.body;

      const pkg = await Package.findById(packageId);
      if (!pkg) return response.notFound(res, "Paket topilmadi");

      const totalReserved = pkg.reservations.reduce(
        (sum, r) => sum + r.reservedCount,
        0
      );

      const totalUsedData = await Clients.aggregate([
        { $match: { package: packageId } },
        { $group: { _id: null, total: { $sum: { $size: "$members" } } } },
      ]);

      let totalUsed = totalUsedData.length > 0 ? totalUsedData[0].total : 0;

      const available = pkg.capacity - (totalReserved + totalUsed);

      if (reservedCount > available) {
        return response.error(res, "Yetarli joy yo'q");
      }

      pkg.reservations.push({ agent: agentId, reservedCount });
      await pkg.save();

      response.success(res, "Bron qilindi", pkg);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // bronni kamaytirish
  async unreservePackage(req, res) {
    try {
      const { packageId, reservId, decCount } = req.body;

      const pkg = await Package.findById(packageId);
      if (!pkg) return response.notFound(res, "Paket topilmadi");

      const reservation = pkg.reservations.find((r) => r._id == reservId);
      if (!reservation) return response.notFound(res, "Bron topilmadi");

      let reservations = pkg.reservations.find((r) => r._id == reservId);

      if (decCount > reservations.reservedCount) {
        return response.error(res, "Yetarli bron yo'q");
      }

      reservations.reservedCount -= decCount;
      await pkg.save();

      response.success(res, "Bronni kamaytirildi", pkg);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new PackageController();
