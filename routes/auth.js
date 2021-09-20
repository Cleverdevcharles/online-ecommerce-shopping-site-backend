const express = require("express")
const router = express.Router()

// Load Controllers
const {
    signup,
    signin,
    signout,
    activation,
    forgotPassword,
    changePassword,
    resetPassword,
    google,
    facebook,
    requireSignin
} = require("../controllers/auth")


const {
    validSignup,
    validSignin,
    forgotPasswordValidator,
    changePasswordValidator,
    resetPasswordValidator,
} = require("../helpers/valid")



router.post("/register", validSignup, signup);
router.post("/login", validSignin, signin);
router.post("/activation", activation);
router.get("/signout", signout);


// forgot reset password / Staff
router.put("/forgotpassword", forgotPasswordValidator, forgotPassword);
router.put("/changepassword", changePasswordValidator, changePassword);
router.put("/resetpassword", resetPasswordValidator, resetPassword);

// Google and Facebook Login
router.post("/googlelogin", google)
router.post("/facebooklogin", facebook)


module.exports = router;