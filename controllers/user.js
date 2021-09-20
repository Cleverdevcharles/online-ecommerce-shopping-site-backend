const User = require("../models/user");
const { Order } = require("../models/order");
const expressJwt = require("express-jwt");

exports.userById = (req, res, next, id) => {
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      // console.log(err);
      return res.status(400).json({
        error: "User not found",
      });
    }
    req.profile = user;
    next();
  });
};

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  req.profile.salt = undefined;
  console.log(req.profile);
  return res.json(req.profile);
};

exports.update = (req, res) => {
  // console.log('UPDATE USER - req.user', req.user, 'UPDATE DATA', req.body);
  const { name, password, phone, address, image, state, country } = req.body;

  User.findOne({ _id: req.profile._id }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    if (!name) {
      return res.status(400).json({
        error: "Name is required",
      });
    } else {
      user.name = name;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error: "Password should be min 8 characters long.",
        });
      } else {
        user.password = password;
      }
    }

    user.country = country;
    user.state = state;
    user.address = address;
    user.phone = phone;
    user.image = image;

    user.save((err, updatedUser) => {
      if (err) {
        console.log("USER UPDATE ERROR", err);
        return res.status(400).json({
          error: "User update failed",
        });
      }
      updatedUser.hashed_password = undefined;
      updatedUser.salt = undefined;
      res.json(updatedUser);
    });
  });
};

exports.list = (req, res) => {
  User.find().exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json(data);
  });
};

exports.addOrderToUserHistory = (req, res, next) => {
  let history = [];

  req.body.order.products.forEach((item) => {
    history.push({
      _id: item._id,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.count,
      transaction_id: req.body.order.transaction_id,
      amount: req.body.order.amount,
    });
  });

  User.findOneAndUpdate(
    { _id: req.profile._id },
    { $push: { history: history } },
    { new: true },
    (error, data) => {
      if (error) {
        return res.status(400).json({
          error: "Could not update user purchase history",
        });
      }
      next();
    }
  );
};

exports.purchaseHistory = (req, res) => {
  Order.find({ user: req.profile._id })
    .populate("user", "_id name")
    .sort("-created")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(orders);
    });
};
