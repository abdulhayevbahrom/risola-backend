const router = require("express").Router();
const cron = require("node-cron");

// Controllers and Validations
const adminController = require("../controller/adminController");
const adminValidation = require("../validation/adminValidation");

router.post("/admin/login", adminController.login);
router.get("/admin/all", adminController.getAdmins);
router.get("/admin/:id", adminController.getAdminById);
router.post("/admin/create", adminValidation, adminController.createAdmin);
router.put("/admin/update/:id", adminValidation, adminController.updateAdmin);
router.delete("/admin/delete/:id", adminController.deleteAdmin);

// package
const packageController = require("../controller/packageController");
const packageValidation = require("../validation/packageValidation");

router.get("/packages/all", packageController.getAllPackages);
router.get("/packages/actives", packageController.getActivePackages);
router.get("/packages/:id", packageController.getPackageById);
router.post(
  "/packages/create",
  packageValidation,
  packageController.createPackage
);
router.post("/packages/bron", packageController.reservePackage);
router.put(
  "/packages/update/:id",
  packageValidation,
  packageController.updatePackage
);
router.delete("/packages/unreserve", packageController.unreservePackage);
router.delete("/packages/delete/:id", packageController.deletePackage);

// clients
const clientController = require("../controller/clientController");
const clientValidation = require("../validation/clientsValidation");

router.get("/clients/all", clientController.getAllClients);
router.post("/clients/create", clientValidation, clientController.createClient);
router.get("/clients/debtors", clientController.getDebtors);
router.get("/clients/addresses", clientController.getUniqueAddresses);
router.get("/clients/payments", clientController.getPaymentsByDateRange);
router.get("/clients/package/:id", clientController.getClientbyPackage);
router.post("/clients/pay-total/:id", clientController.payTotalClient);
router.delete("/clients/delete/:id", clientController.deleteClient);
router.put(
  "/clients/update/:id",
  clientValidation,
  clientController.updateClient
);
router.delete(
  "/clients/delete-member/:id/:member_id",
  clientController.deleteMember
);

// salary
const SalaryController = require("../controller/salaryController");

router.get("/salaries/month", SalaryController.getMonthlySalaries);
router.post("/salaries/pay", SalaryController.paySalary);
router.get("/salaries/history", SalaryController.getAllSalaries);

// expense
const ExpenseController = require("../controller/expensesController");

router.get("/expense/all", ExpenseController.getExpenses);
router.post("/expense/create", ExpenseController.createExpense);
router.put("/expense/update/:id", ExpenseController.updateExpense);
router.delete("/expense/delete/:id", ExpenseController.deleteExpense);

// package
const DashboardController = require("../controller/dashboardController");

router.get("/dashboard", DashboardController.getDashboard);
router.get("/kassa", DashboardController.getKassaInfo);

cron.schedule("5 0 * * *", async () => {
  await packageController.deactivateOldPackages();
});

module.exports = router;
