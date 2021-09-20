const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");
const Post = require("../models/post");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.postById = (req, res, next, id) => {
  Post.findById(id)
    .populate("category")
    .exec((err, post) => {
      if (err || !post) {
        return res.status(400).json({
          error: "Post not found",
        });
      }
      req.post = post;
      next();
    });
};

exports.read = (req, res) => {
  req.post.photo = undefined;
  return res.json(req.post);
};

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }
    // check for all fields
    const {
      title,
      content,
      authour,
      category,
    } = fields;

    if (!title || !content || !authour || !category) {
      return res.status(400).json({
        error: "All fields are required." + err,
      });
    }

    let post = new Post(fields);

    // 1kb = 1000
    // 1mb = 1000000

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: "Image should be less than 1mb in size",
        });
      }
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }

    post.save((err, result) => {
      if (err) {
        console.log("POST CREATE ERROR ", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(result);
    });
  });
};

exports.remove = (req, res) => {
  let post = req.post;
  post.remove((err, deletedPost) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json({
      message: "Post deleted successfully",
    });
  });
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    let post = req.post;
    post = _.extend(post, fields);

    // 1kb = 1000
    // 1mb = 1000000

    if (files.photo) {
      // console.log("FILES PHOTO: ", files.photo);
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: "Image should be less than 1mb in size",
        });
      }
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }

    post.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(result);
    });
  });
};

/**
 * sell / arrival
 * by sell = /posts?sortBy=sold&order=desc&limit=1
 * by arrival = /posts?sortBy=createdAt&order=desc&limit=1
 * if no params are sent, then all posts are returned
 */

exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Post.find()
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, posts) => {
      if (err) {
        return res.status(400).json({
          error: "Posts not found",
        });
      }
      res.json(posts);
    });
};

/**
 * it will find the posts based on the req post category
 * other posts that has the same category, will be returned
 */

exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Post.find({ _id: { $ne: req.post }, category: req.post.category })
    .limit(limit)
    .populate("category", "_id name")
    .exec((err, posts) => {
      if (err) {
        return res.status(400).json({
          error: "Posts not found",
        });
      }
      res.json(posts);
    });
};

exports.listCategories = (req, res) => {
  Post.distinct("category", {}, (err, categories) => {
    if (err) {
      return res.status(400).json({
        error: "Categories not found",
      });
    }
    res.json(categories);
  });
};

/**
 * list posts by search
 * we will implement post search in react frontend
 * we will show categories in checkbox and price range in radio buttons
 * as the user clicks on those checkbox and radio buttons
 * we will make api request and show the posts to users based on what he wants
 */

exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  // console.log(order, sortBy, limit, skip, req.body.filters);
  // console.log("findArgs", findArgs);

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1],
        };
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  Post.find(findArgs)
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Posts not found",
        });
      }
      res.json({
        size: data.length,
        data,
      });
    });
};

exports.photo = (req, res, next) => {
  if (req.post.photo.data) {
    res.set("Content-Type", req.post.photo.contentType);
    return res.send(req.post.photo.data);
  }
  next();
};

exports.listSearch = (req, res) => {
  // create query object to hold search value and category value
  const query = {};
  // assign search value to query.name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
    // assigne category value to query.category
    if (req.query.category && req.query.category != "All") {
      query.category = req.query.category;
    }
    // find the post based on query object with 2 properties
    // search and category
    Post.find(query, (err, posts) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(posts);
    }).select("-photo");
  }
};