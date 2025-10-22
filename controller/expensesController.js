const Expense = require("../model/expenseModel");
const response = require("../utils/response");

class ExpenseController {
  async createExpense(req, res) {
    try {
      const expense = new Expense(req.body);

      await expense.save();

      return response.created(res, `Malumot saqlandi`, expense);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  async getExpenses(req, res) {
    try {
      const { startDate, endDate, type } = req.query;
      let query = {};

      // Sana oralig'i filtri
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Kirim / Chiqim filtri
      if (type) {
        query.type = type; // "kirim" yoki "chiqim"
      }

      const expenses = await Expense.find(query)
        .sort({ createdAt: -1 })
        .populate("worker_id", "lastName firstName");

      return response.success(
        res,
        "Ma'lumotlar muvaffaqiyatli olindi",
        expenses
      );
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const updated = await Expense.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!updated) {
        return response.notFound(res, "Malumot topilmadi");
      }

      return response.success(res, "Malumot yangilandi", updated);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  async deleteExpense(req, res) {
    try {
      const { id } = req.params;

      let result = await Expense.findByIdAndDelete(id);

      if (!result) {
        return response.notFound(res, "Malumot topilmadi");
      }

      return response.success(res, "Malumot muvaffaqiyatli o'chirildi");
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }
}

module.exports = new ExpenseController();
