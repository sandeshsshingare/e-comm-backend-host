const asyncErrorHandler = require("../utils/asyncErrorHandler");
const indexModel = require("./../models/indexModels");
const path = require("path");
const fs = require("fs");
const Apifeatures = require("./../utils/ApiFeatures");
const CustomError = require("../utils/customErrorHandler");
const { json } = require("body-parser");
const { default: mongoose } = require("mongoose");
var { ObjectId } = require("mongodb");
const cloudinary = require("cloudinary").v2;

const createProduct = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  console.log(tokenObj);
  const seller = await indexModel.SellerAuth.findOne({
    _id: new ObjectId(tokenObj.id),
  });

  console.log(seller);
  const org = await indexModel.Organization.findOne({
    _id: new ObjectId(seller._org),
  });

  const { name, description, price, category = "" } = req.body;
  console.log(category);
  let arr = [];

  for (let k = 0; k < req.files.length; k++) {
    const result = await cloudinary.uploader.upload(req.files[k].path, {
      folder: "Product Images",
    });
    arr.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
    let a = String(req.files[k]["path"]);
    fs.unlinkSync(a);
  }

  console.log(arr);
  const objData = {
    name: name,
    description: description,
    price: price,
    images: arr,
    category: category.toLowerCase(),
    sellerId: seller._id,
    _org: org,
  };
  const productData = await indexModel.Product.create(objData);
  res.json({
    success: "success",
    data: productData,
  });
});

const getOneProduct = asyncErrorHandler(async (req, res, next) => {
  const productId = req.params.productId;
  let a = productId.toString();
  let productData = await indexModel.Product.findById(productId);

  if (productData.deals) {
    let length = productData.deals.length;
    console.log("deal length", productData.deals.length);
    let flag = false;
    for (let J = length - 1; J >= 0; J--) {
      const dealData = await indexModel.ProductDeal.findById(
        productData.deals[J]
      );

      if (
        !flag &&
        dealData.deleted !== true &&
        dealData.ends > new Date().toISOString()
      ) {
        let discount = dealData._doc.discount;
        let price = productData.price;
        let dealPrice = Math.floor(price - (price * discount) / 100);

        let obj = {
          ...productData._doc,
          deal: dealData._doc,
          dealPrice: dealPrice,
        };
        productData = obj;
        flag = true;
      } else {
        await indexModel.ProductDeal.findByIdAndUpdate(productData.deals[J], {
          deleted: true,
        });
      }
    }
  }
  let arr = [];

  const reviews = await indexModel.Review.aggregate([
    {
      $match: {
        product_id: new ObjectId(productId),
      },
    },
    {
      $lookup: {
        from: "shopcustomers",
        localField: "customer_id",
        foreignField: "_id",
        as: "result",
      },
    },
    {
      $project: {
        caption: "$caption",
        customer_name: "$result.name",
        star: "$star",
        picture: "$result.picture",
        customer_id: "$result._id",
      },
    },
  ]);

  let d = JSON.stringify(productData);
  let ab = JSON.parse(d);
  productData = { ...ab, reviews: reviews };
  // productData = obj;
  res.status(200).json({
    status: "success",
    data: productData,
  });
});

const listOfProduct = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  const { page = 1, limit = 5, sort = "-createdAt", search = "" } = req.query;

  const allDoc = await indexModel.Product.find({ sellerId: tokenObj.id });
  let features = await indexModel.Product.find({
    sellerId: tokenObj.id,
    name: { $regex: search, $options: "i" },
  })
    .limit(limit)
    .skip((page - 1) * limit)
    .sort(sort);

  let deal;

  const product = features;
  res.status(200).json({
    status: "success",
    results: product,
    page: page,
    limit: limit,
    totalResults: allDoc.length,
    totalPages: Math.ceil(allDoc.length / limit),
  });
});

const updateProduct = asyncErrorHandler(async (req, res, next) => {
  const { name, description, price, category } = req.body;
  const tokenObj = req.tokenObj;
  const prodId = req.params.productId;
  const updateProd = await indexModel.Product.findByIdAndUpdate(
    prodId,
    { name: name, description: description, price: price, category: category },
    { runValidators: true, new: true }
  );
  res.status(200).json({
    status: "success",
    results: updateProd,
  });
});

const updateProdImages = asyncErrorHandler(async (req, res, next) => {
  const { new_images } = req.body;

  const files = req.files;
  let deleteImages = [];
  deleteImages = req.body.delete || [];

  const product = await indexModel.Product.find({ _id: req.params.productId });
  let imagesFromMongo = [];
  imagesFromMongo = product[0].images;

  for (let k = 0; k < req.files.length; k++) {
    const result = await cloudinary.uploader.upload(req.files[k]["path"]);
    imagesFromMongo.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
    let a = String(req.files[k]["path"]);
    fs.unlinkSync(a);
  }

  let uImgs = [];
  for (let i = 0; i < imagesFromMongo.length; i++) {
    if (deleteImages.length !== 0) {
      inner: for (let j = 0; j < deleteImages?.length; j++) {
        if (
          imagesFromMongo[i].public_id !==
          JSON.parse(deleteImages[j])["public_id"]
        ) {
          uImgs.push(imagesFromMongo[i]);
          break inner;
        }
      }
    } else {
      uImgs.push(imagesFromMongo[i]);
    }
  }

  // let newImg = [];
  // imagesFromMongo.forEach((data) => {
  //   deleteImages.forEach((img) => {
  //     if (data.public_id !== JSON.parse(img)["public_id"]) {
  //       newImg.push(data);
  //     }
  //   });
  // });

  const updatedProduct = await indexModel.Product.findByIdAndUpdate(
    req.params.productId,
    { images: uImgs },
    { runValidators: true, new: true }
  );
  newImg = [];
  for (let i = 0; i < deleteImages?.length; i++) {
    await cloudinary.uploader.destroy(deleteImages[i]["public_id"]);
  }

  res.status(200).json({
    status: "success",
    results: updatedProduct,
  });
});

const updateProductImages = asyncErrorHandler(async (req, res, next) => {
  var deleteImages = { ...req.body };
  let k = deleteImages.delete;
  let isArray = Array.isArray(k);
  if (isArray) {
    let abc = [];

    for (var i of deleteImages.delete) {
      abc.push(JSON.parse(i || "{}"));
    }
    deleteImages = [...abc];
  } else {
    deleteImages = JSON.parse(k || "{}") || "{}";
  }

  let newImages = [];

  const product = await indexModel.Product.findById(req.params.productId);
  let previousImages = product.images || [];
  // new images
  for (let k = 0; k < req.files.length; k++) {
    const result = await cloudinary.uploader.upload(req.files[k]["path"]);
    previousImages.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
    let a = String(req.files[k]["path"]);
    fs.unlinkSync(a);
  }

  // adding new images end
  // deleting the images
  let flag = false;
  if (deleteImages.length === 0) {
    newImages = previousImages;
  } else {
    for (let j = 0; j < previousImages.length; j++) {
      flag = false;
      if (isArray) {
        for (let i = 0; i < deleteImages.length; i++) {
          let match = deleteImages[i]["public_id"];
          if (previousImages[j]["public_id"] === match) {
            await cloudinary.uploader.destroy(match, {}, (err) => {
              if (err) {
                let error = new CustomError(501, "Error while deleting image");
                next(error);
              }
            });
            flag = true;
            break;
          }
        }
      } else {
        if (previousImages[j].public_id === deleteImages.public_id) {
          flag = true;
        }
      }
      if (!flag) {
        newImages.push(previousImages[j]);
      }
    }
  }

  // deleting the images complete

  let productData = await indexModel.Product.findByIdAndUpdate(
    req.params.productId,
    {
      images: newImages,
    },
    { runValidators: true, new: true }
  );

  res.status(200).json({ result: productData });
});

const deleteProduct = asyncErrorHandler(async (req, res, next) => {
  const prodId = req.params.productId;
  const deleteProd = await indexModel.Product.findByIdAndDelete(prodId);
  res.status(200).json({
    status: "success",
    results: null,
  });
});

const addDeal = asyncErrorHandler(async (req, res, next) => {
  const sellerId = req.tokenObj.id;
  const productId = req.params.productId;
  const { discount, ends } = req.body;
  let date = new Date(ends);
  if (date < new Date()) {
    const err = new CustomError("Deal ends date must greater than today", 401);
    return next(err);
  }

  const dealData = await indexModel.ProductDeal.create({
    discount,
    ends,
    sellerId,
  });

  const addDealProduct = await indexModel.Product.findByIdAndUpdate(
    productId,
    {
      $push: { deals: dealData._id },
    },
    { new: true, runValidators: true }
  );

  let price = addDealProduct.price;
  let dealPrice = Math.floor(price - (price * discount) / 100);

  let obj = { ...addDealProduct._doc, deal: dealData, dealPrice: dealPrice };
  res.status(200).json({
    status: "success",
    results: obj,
  });
});

const removeDeal = asyncErrorHandler(async (req, res, next) => {
  const dealId = req.query.dealId;

  const dealData = await indexModel.ProductDeal.findByIdAndUpdate(
    dealId,
    { deleted: true },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    results: dealData,
  });
});

const addReview = asyncErrorHandler(async (req, res, next) => {
  const productId = req.params.productId;
  const customerId = req.tokenObj.id;
  const { star, caption, customer_name, customer_photo } = req.body;
  const reviewData = await indexModel.Review.create({
    star: star,
    caption: caption,

    customer_id: customerId,
    product_id: productId,
  });

  res.status(200).json({
    status: "success",
    results: "Review added successfully",
  });
});

const getDashboard = asyncErrorHandler(async (req, res, next) => {
  const sellerId = req.tokenObj.id;

  const products = await indexModel.Product.aggregate([
    {
      $match: {
        sellerId: new ObjectId(sellerId),
      },
    },
    {
      $group: {
        _id: "$category",
        name: { $first: "$category" },
        value: { $sum: 1 },
      },
    },
  ]);

  const orderDetails = await indexModel.Order.aggregate([
    {
      $match: {
        sellerId: new ObjectId(sellerId),
      },
    },

    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },

        count: { $sum: 1 },
      },
    },
  ]);

  let months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  let arr = [];

  ss: for (let i = 0; i < months.length; i++) {
    for (let j = 0; j < orderDetails.length; j++) {
      if (orderDetails[j]["_id"]["month"] === i + 1) {
        let obj = {
          name: months[i].toLocaleString(),
          value: orderDetails[j]["count"],
        };
        arr.push(obj);
        continue ss;
      }
    }
    let obj = { name: months[i].toLocaleString(), value: 0 };
    arr.push(obj);
  }

  // const orderDetails = await Order.aggregate(getPipe());
  res.json({
    status: "success",
    results: {
      product: products,
      order: arr,
    },
  });
});

function getPipe() {
  return [
    // {
    //   $replaceWith: {
    //     $setField: {
    //       field: "createdAt",
    //       input: "$$ROOT",
    //       value: { $toString: "$createdAt" },
    //     },
    //   },
    // },
    {
      $match: {
        createdAt: { $toStr: "$createdAt" },
      },
    },
  ];
}

module.exports = {
  createProduct,
  getOneProduct,
  listOfProduct,
  updateProduct,
  deleteProduct,
  updateProdImages,
  updateProductImages,
  addDeal,
  removeDeal,
  addReview,
  getDashboard,
};
