const express= require('express');
const shopAuthRoutes = require("./shopAuthRoutes");
const userRoutes = require("./userRouter");
const productRoutes = require('./productRoute')
const emailRoutes = require("./emailRoute");
const shopSideRoutes = require("./shopSideRoutes");
const shopCustomerRoutes = require("./customersRoutes");
const sellerOrderRoutes = require("./sellerOrderRoutes");
const router = express.Router();


router.use("/auth", shopAuthRoutes);
router.use("/users", userRoutes);
router.use("/emails", emailRoutes);
router.use("/products", productRoutes);
router.use("/shop", shopSideRoutes);
router.use("/customers", shopCustomerRoutes);
router.use("/orders", sellerOrderRoutes);

module.exports = router