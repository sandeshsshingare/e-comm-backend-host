const ApiFeatures = require("../utils/ApiFeatures");
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const CustomError = require("../utils/customErrorHandler");
const indexModel = require('./../models/indexModels')

const getAllOrders = asyncErrorHandler(async (req, res, next) => {
  const allOrders = await indexModel.Order.find({ sellerId: req.tokenObj.id });
  const { page = 1, limit = 5 } = req.query;
  const count = allOrders.length;
  const features = new ApiFeatures(
    indexModel.Order.find({ sellerId: req.tokenObj.id }),
    req.query
  );
  const allData = await features.query;
  res.status(200).json({
    results: allData,
    page: page,
    limit: limit,
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  });
});

const getSpecificOrder = asyncErrorHandler(async (req, res, next) => {
  const orderData = await indexModel.Order.findById(req.params.orderId);
  if (!orderData) {
    const error = new CustomError(
      `The order id ${req.params.orderId} is not present`,
      400
    );
    return next(error);
  }
  res.status(200).json({
    results: orderData,
  });
});

const orderAction = asyncErrorHandler(async (req, res, next) => {
  const orderData = await indexModel.Order.findById(req.params.orderId);
  var isCancelled = false;
  if (!orderData) {
    const error = new CustomError(
      `The order id ${req.params.orderId} is not present`,
      400
    );
    return next(error);
  }
  if (req.params.action === "Cancelled") {
    isCancelled = true;
  }
  if (orderData.status === "Cancelled") {
    let e = new CustomError("The order is already cancelled", 401);
    return next(e);
  }
  const updatedData = await indexModel.Order.findByIdAndUpdate(req.params.orderId, {
    status: req.params.action,
    paymentStatus: isCancelled ? "Refunded" : "Paid",
  });
  res.status(200).json({
    results: orderData,
  });
});

module.exports = {
  getAllOrders,
  getSpecificOrder,
  orderAction,
};
