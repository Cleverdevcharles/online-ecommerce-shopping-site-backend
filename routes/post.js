const express = require("express");
const router = express.Router();

const {
  create,
  postById,
  read,
  remove,
  update,
  list,
  listRelated,
  listCategories,
  listBySearch,
  photo,
  listSearch,
} = require("../controllers/post");
const { requireSignin, isAuth, isAdmin } = require("../controllers/auth");
const { userById } = require("../controllers/user");

router.get("/post/:postId", read);
router.post("/post/create/:userId", requireSignin, isAuth, isAdmin, create);
router.delete(
  "/post/:postId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  remove
);
router.put(
  "/post/:postId/:userId",
  requireSignin,
  isAuth,
  isAdmin,
  update
);

router.get("/posts", list);
router.get("/posts/search", listSearch);
router.get("/posts/related/:postId", listRelated);
router.get("/posts/categories", listCategories);
router.post("/posts/by/search", listBySearch);
router.get("/post/photo/:postId", photo);

router.param("userId", userById);
router.param("postId", postById);

module.exports = router;
