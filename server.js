const express = require("express");
const app = express();
const connnectDB = require("./config/database");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
// const expressValidator = require('express-validator');
require("dotenv").config();

// LOAD ALL ROUTES
const authRoute = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const braintreeRoutes = require("./routes/braintree");
const productRoutes = require("./routes/product");
const postRoutes = require("./routes/post");
const siteRoutes = require("./routes/site");
const orderRoutes = require("./routes/order");

// DATABASE
connnectDB();

// MIDDELWARES
if (process.env.NODE_ENV === "development") {
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
    })
  );
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "2mb" }));
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());
app.use(cookieParser());
// app.use(expressValidator());

// USE ALL ROUTES
app.use("/api", authRoute);
app.use("/api", userRoutes);
app.use("/api", categoryRoutes);
app.use("/api", productRoutes);
app.use("/api", postRoutes);
app.use("/api", siteRoutes);
app.use("/api", braintreeRoutes);
app.use("/api", orderRoutes);

app.use((req, res, next) => {
  res.status(404).send(`<h1>Opps!!! PAGE NOT FOUND</h1>`);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server Connected : http://localhost:${port}`);
});
