const indexModel  = require('./../models/indexModels')
const fs = require("fs");
const path = require("path");
const asyncErrorHandler = require("./../utils/asyncErrorHandler");
const CustomError = require("../utils/customErrorHandler");
const cloudinary = require("cloudinary").v2;
const updateCustomerProfile = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;

  const { name, email } = req.body;

  const updateProfile = await indexModel.CustomerRegistration.findByIdAndUpdate(
    tokenObj.id,
    { name, email },
    { runValidators: true, new: true }
  );

  res.status(200).json({
    message: "success",
    results: updateProfile,
  });
});

const updateCustomerPicture = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  const previousData = await indexModel.CustomerRegistration.findById(tokenObj.id);
  let picture = previousData.picture;
  // await cloudinary.uploader.destroy(picture["public_id"]);
  console.log(req.file);
  let result = await cloudinary.uploader.upload(req.file["path"], {
    folder: "Customer Pictures",
  });

  let pictureObj = {
    url: result.secure_url,
    public_id: result.public_id,
  };
  const updateData = await indexModel.CustomerRegistration.findByIdAndUpdate(
    tokenObj.id,
    {
      picture: pictureObj,
    },
    { runValidators: true, new: true }
  );
  const data = await indexModel.CustomerRegistration.findById(tokenObj.id);
  setTimeout(() => {
    res.status(200).json({
      status: "success",
      message: "Profile picture updated successfully",
      results: data,
    });
  }, 1000);
});

const deleteProfilePicture = asyncErrorHandler(async (req, res, next) => {
  console.log("delete picture called");
  const tokenObj = req.tokenObj;
  const customerData = await indexModel.CustomerRegistration.findById(tokenObj.id);
  console.log(customerData);
  const picture = customerData.picture;
  let default_url =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSg-z5yd8c2ukIWdDLepcCRumTuC4Mlfx7hGA&usqp=CAU";
  console.log(picture["public_id"]);
  if (picture["url"] !== default_url) {
    await cloudinary.uploader.destroy(picture["public_id"]);
  } else {
    return res.status(200).json({ message: "Already deleted" });
  }
  await indexModel.CustomerRegistration.findByIdAndUpdate(tokenObj.id, {
    picture: { public_id: "", url: default_url },
  });

  res.status(200).json({
    message: "Profile image is deleted Successfully",
  });
});

const getSavedAddress = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  const customerData = await indexModel.CustomerRegistration.findById(tokenObj.id);
  const addresses = customerData.address;
  res.status(200).json({
    status: "success",
    results: addresses,
  });
});

const addAddress = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;

  const customerData = await indexModel.CustomerRegistration.findByIdAndUpdate(tokenObj.id, {
    $push: { address: req.body },
  });

  res.status(200).json(req.body);
});

const updateAddress = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  const { street, city, state, addressLine2, pin } = req.body;
  const addressId = req.params.addressId;
  const customerData = await indexModel.CustomerRegistration.findOneAndUpdate(
    { _id: tokenObj.id, "address._id": addressId },
    {
      $set: {
        "address.$.street": street,
        "address.$.city": city,
        "address.$.state": state,
        "address.$.addressLine2": addressLine2,
        "address.$.pin": pin,
        "address.$._id": addressId,
      },
    }
  );

  res.status(200).json({
    message: "updated",
  });
});

const deleteAddress = asyncErrorHandler(async (req, res, next) => {
  const tokenObj = req.tokenObj;
  const addressId = req.params.addressId;
  const customerData = await indexModel.CustomerRegistration.findOneAndUpdate(
    { _id: tokenObj.id },
    {
      $pull: { address: { _id: addressId } },
    },
    { safe: true, multi: false }
  );
  res.status(200).json(req.body);
});

const changePassword = asyncErrorHandler(async (req, res, next) => {
  const { old_password, new_password } = req.body;
  const customerData = await indexModel.CustomerRegistration.findById(req.tokenObj.id).select(
    "+password"
  );
  if (customerData.password !== old_password) {
    const error = new CustomError("Old password doesn't match", 401);
    return next(error);
  }
  const updatePassword = await indexModel.CustomerRegistration.findByIdAndUpdate(req.tokenObj.id, {
    password: new_password,
  });
  res.status(200).json({
    message: "Password updated successfully",
  });
});

const deleteAccount = asyncErrorHandler(async (req, res, next) => {
  await indexModel.CustomerRegistration.findByIdAndDelete(req.tokenObj.id);

  res.status(200).json({
    data: null,
    message: "User deleted successfully",
  });
});

module.exports = {
  updateCustomerProfile,
  updateCustomerPicture,
  deleteProfilePicture,
  getSavedAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  changePassword,
  deleteAccount,
};
