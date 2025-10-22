const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

// 🔧 Custom keyword: agar role=admin/employee bo‘lsa login & password majburiy
ajv.addKeyword({
  keyword: "conditionalRequired",
  modifying: false,
  validate: function (
    schema,
    data,
    parentSchema,
    dataPath,
    parentData,
    propertyName
  ) {
    if (schema.if.includes(parentData?.role)) {
      for (const field of schema.then) {
        if (!parentData[field]) {
          this.errors = [
            {
              keyword: "conditionalRequired",
              message: `${field} ${parentData.role} uchun majburiy`,
            },
          ];
          return false;
        }
      }
    }
    return true;
  },
  errors: true,
});

const adminValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      firstName: { type: "string", minLength: 2, maxLength: 50 },
      lastName: { type: "string", minLength: 2, maxLength: 50 },
      phone: { type: "string", minLength: 9, maxLength: 20 },
      login: {
        type: "string",
        minLength: 4,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9]+$",
      },
      password: { type: "string", minLength: 6, maxLength: 50 },
      role: { type: "string", enum: ["admin", "agent", "employee", "kassa"] },
      address: { type: "string", minLength: 3, maxLength: 100 },
      isActive: { type: "boolean" },
      salary: { type: "number", minimum: 0 },
      permissions: { type: "array", items: { type: "string" } },
      position: { type: "string", minLength: 1, maxLength: 50 },
      leader: { type: "boolean", default: false },
    },
    required: ["firstName", "lastName", "phone", "role"],
    additionalProperties: false,

    conditionalRequired: {
      if: ["admin", "employee"],
      then: ["login", "password"],
    },

    errorMessage: {
      required: {
        firstName: "Ism kiritish shart",
        lastName: "Familiya kiritish shart",
        phone: "Telefon raqami kiritish shart",
        role: "Rolni kiritish shart",
      },
      properties: {
        firstName: "Ism 2-50 ta belgi oralig‘ida bo‘lishi kerak",
        lastName: "Familiya 2-50 ta belgi oralig‘ida bo‘lishi kerak",
        phone: "Telefon raqam noto‘g‘ri formatda",
        login: "Login 4-20 ta belgidan iborat bo‘lishi kerak",
        password: "Parol 6-50 ta belgi oralig‘ida bo‘lishi kerak",
        role: "Role faqat 'admin', 'agent' yoki 'employee' bo‘lishi kerak",
        salary: "Oylik miqdori manfiy bo‘lishi mumkin emas",
        address: "Manzil 3-100 ta belgi oralig‘ida bo‘lishi kerak",
        position: "Lavozim 1-50 ta belgi oralig‘ida bo‘lishi kerak",
      },
      additionalProperties: "Ruxsat etilmagan maydon kiritildi",
    },
  };

  const validate = ajv.compile(schema);
  const valid = validate(req.body);

  if (!valid) {
    const errorMsg =
      validate.errors?.[0]?.message || "Ma’lumotlar noto‘g‘ri kiritilgan";
    return response.error(res, errorMsg);
  }

  next();
};

module.exports = adminValidation;
