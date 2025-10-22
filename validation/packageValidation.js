const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });
require("ajv-errors")(ajv);
require("ajv-formats")(ajv);
const response = require("../utils/response");

const packageValidation = (req, res, next) => {
  const schema = {
    type: "object",
    properties: {
      title: { type: "string", minLength: 3, maxLength: 50 },
      capacity: { type: "number", minimum: 1 },
      min_price: { type: "number", minimum: 1 },
      description: { type: "string", maxLength: 200 },
      startDate: {
        type: "string",
        format: "date-time",
      },
      endDate: {
        type: "string",
        format: "date-time",
      },
      leader: { type: "array", items: { type: "string" } },
    },
    required: ["title", "capacity", "min_price", "startDate", "endDate"],
    additionalProperties: false,
    errorMessage: {
      required: {
        title: "Title majburiy",
        capacity: "Capacity majburiy",
        min_price: "Min price majburiy",
        startDate: "Start date majburiy",
        endDate: "End date majburiy",
      },
      properties: {
        title: "Title noto‘g‘ri kiritildi",
        capacity: "Capacity noto‘g‘ri kiritildi",
        min_price: "Min price noto‘g‘ri kiritildi",
        startDate: "Start date noto‘g‘ri formatda",
        endDate: "End date noto‘g‘ri formatda",
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

module.exports = packageValidation;
