const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const clientsValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      package: { type: "string" },
      groupName: { type: "string" },
      members: {
        type: "array",
        items: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            middleName: { type: "string" },
            birthDate: { type: "string" },
            idNumber: { type: "string" },
            phone: {
              type: "array",
              items: {
                type: "string",
              },
            },
            idNumberExpiryDate: { type: "string" },
          },
        },
      },
      pricePerOne: { type: "number", minimum: 0 },
      totalPrice: { type: "number" },
      paymentHistory: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number", minimum: 0 },
            paymentType: {
              type: "string",
              enum: ["naqd", "karta"],
              default: "naqd",
            },
          },
        },
      },
      address: {
        type: "object",
        properties: {
          region: { type: "string" },
          district: { type: "string" },
        },
      },
      agent: { type: "string" },
      target: { type: "string" },
    },
    required: ["package", "groupName", "members", "totalPrice", "address"],
    additionalProperties: false,
    errorMessage: {
      required: {
        package: "Paket majburiy",
        groupName: "Guruh yoki ism familiya majburiy",
        members: "kamida bitta mijoz majburiy",
        totalPrice: "Umumiy narx majburiy",
        address: "Manzil majburiy",
        target: "Qayerdan eshitdi",
      },
      properties: {
        package: "Paket noto‘g‘ri kiritildi",
        groupName: "Guruh yoki ism familiya noto‘g‘ri kiritildi",
        members: "Mijozlar noto‘g‘ri kiritildi",
        totalPrice: "Umumiy narx noto‘g‘ri kiritildi",
        address: "Manzil noto‘g‘ri kiritildi",
        target: "Qayerdan eshitdi",
      },
      additionalProperties: "Ruxsat etilmagan maydon kiritildi",
    },
  };

  const validate = ajv.compile(schema);
  const valid = validate(req.body);

  if (!valid) {
    const errorField =
      validate.errors[0].instancePath.replace("/", "") || "Umumiy";
    const errorMessage = validate.errors[0].message;
    return response.error(res, `${errorField} xato: ${errorMessage}`);
  }

  next();
};

module.exports = clientsValidation;
