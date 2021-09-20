const express = require("express");
const router = express.Router();

const {
  create,
  siteById,
  read,
  list,
  remove,
  update,
  logo,
} = require("../controllers/site");
const { requireSignin, isAuth, isAdmin } = require("../controllers/auth");
const { userById } = require("../controllers/user");

router.get("/site/:siteId", read);
router.post("/site/create/:userId", requireSignin, isAuth, isAdmin, create);
router.delete("/site/:siteId/:userId", requireSignin, isAuth, isAdmin, remove);
router.put("/site/:siteId/:userId", requireSignin, isAuth, isAdmin, update);

router.get("/site/logo/:siteId", logo);
router.get("/sites", list);

router.param("userId", userById);
router.param("siteId", siteById);

module.exports = router;
