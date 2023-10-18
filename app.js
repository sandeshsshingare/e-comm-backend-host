const express = require("express");
const indexRoutes = require('./routes/indexRoutes')
const path = require("path");
const multer = require("multer");
const bodyParser = require("body-parser");
const errorHandler = require("./controllers/errorController");
const passport = require("passport");
const cors = require("cors");
const app = express();
const CustomError = require("./utils/customErrorHandler");

const cloudinary = require("cloudinary");
const corsOptions = {
  origin: '*', // Replace with the actual origin of your Angular app
};
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
//We need to add this lines to use EJS
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("./public"));

app.get("/invoice-pdf", function (req, res) {
  console.log(__dirname);
  res.sendFile(__dirname + "/my-invoice.pdf");
});
cloudinary.v2.config({
  cloud_name: "dadxfjg93",
  api_key: "364985937859155",
  api_secret: "gYRhnH7XIsQu5WnFTKH3Y9Vo35A",
  secure: false,
});
app.use(express.json());

app.use("/", indexRoutes);


app.all("*", (req, res, next) => {
  const error = new CustomError(`The URL ${req.originalUrl} is not found`, 404);
  next(error);
});
app.use(errorHandler);

module.exports = app;
