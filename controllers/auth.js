const User = require("../models/user");
const expressJwt = require("express-jwt");
const _ = require("lodash");
const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { errorHandler } = require("../helpers/dbErrorHandler");
// const sgMail = require("@sendgrid/mail");
const mailgun = require("mailgun-js");
const DOMAIN = process.env.MAIL_GUN_DOMAIN;
const mg = mailgun({ apiKey: process.env.MAIL_GUN_API_KEY, domain: DOMAIN });
// sgMail.setApiKey(process.env.MAIL_KEY);

exports.signup = (req, res) => {
  const { name, email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.status(422).json({
      errors: firstError,
    });
  } else {
    User.findOne({
      email,
    }).exec((err, user) => {
      if (user) {
        return res.status(400).json({
          errors: "Account with this email already exits.",
        });
      }
    });

    const token = jwt.sign(
      {
        name,
        email,
        password,
      },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: "15m",
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Account Activation Link",
      html: `
        <div style="border: 1px solid #000 ; border-radius: 10px; padding: 20px;">
          <br />
          <div class="card-header">
          <h1 style="color: #000000; text-align: center;"><b>Account Activation </b></h1>
          </div>
          <hr />
          <br />
          <div class="card-body">
            <h2 class="card-title" style="text-align: center; color: #000;">
              Hello <span style="color: #4169E1">${name}</span>, We received your request to signup for an account.
            </h2>
            <p>You are almost there, click on verify to signup successfully.</p>
            <h3 class="card-text" style="text-align: center; color: #000;">
              By clicking on <b style="color: #4169E1;">Verify</b>,
              you are accepting to create an account with us.
            </h3>
            <center style="border-radius: 10px;"><a href="${process.env.CLIENT_URL}/users/activate/${token}" style="
              border: none;
              outline: 0;
              display: inline-block;
              padding: 15px;
              color: #ffffff;
              background-color: #4169E1;
              border-radius: 10px;
              text-align: center;
              cursor: pointer;
              font-size: 18px;
          "><b>Verify</b></a></center>
          <br />
          <hr />
          <p>This message was sent to ${email} at your request.</p>
          </div>
          ${process.env.CLIENT_URL}/users/activate/${token}
          </div>`,
    };

    // mg.messages().send(emailData, function (error, body) {
    //   if (error) {
    //     console.log(error);
    //     return res.status(400).json({
    //       success: false,
    //       errors: errorHandler(error),
    //     });
    //   }
    //   return res.json({
    //     message: `Email has been sent to ${email}, kindly activate your account.`,
    //   });
    // });

    mg.messages().send(emailData)
      .then((sent) => {
        console.log(sent);
        return res.json({
          message: `Email has been sent to ${email}, kindly activate your account.`,
        });
      })
      .catch((err) => {
        console.log(err);
        return res.status(400).json({
          success: false,
          errors: errorHandler(err),
        });
      });
  }
};

exports.activation = (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          errors: "Expired link. Signup again",
        });
      } else {
        const { name, email, password } = jwt.decode(token);

        const user = new User({
          name,
          email,
          password,
        });

        user.save((err, user) => {
          if (err) {
            console.log("Save error", errorHandler(err));
            return res.status(401).json({
              errors: errorHandler(err),
            });
          } else {
            return res.json({
              success: true,
              message: "Account activated Successfull. You can now signin.",
            });
          }
        });
      }
    });
  } else {
    return res.json({
      message: "Error happening please try again",
    });
  }
};

exports.signin = (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.status(422).json({
      errors: firstError,
    });
  } else {
    // check if user exist
    User.findOne({ email }, (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User with that email does not exist. Please signup",
        });
      }
      // if user is found make sure the email and password match
      // create authenticate method in user model
      if (!user.authenticate(password)) {
        return res.status(401).json({
          error: "Email and password don't match",
        });
      }
      // generate a signed token with user id and secret
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      // persist the token as 't' in cookie with expiry date
      res.cookie("t", token, { expire: new Date() + 9999 });
      // return response with user and token to frontend client
      const { _id, name, email, role } = user;
      return res.json({ token, user: { _id, email, name, role } });
    });
  }
};

// req.user._id
exports.requireSignin = expressJwt({
  secret: process.env.SECRET,
  userProperty: "auth",
});

exports.adminMiddleware = (req, res, next) => {
  User.findById({
    _id: req.user._id,
  }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    if (user.role !== "Admin") {
      return res.status(400).json({
        error: "Admin resource. Access denied.",
      });
    }

    req.profile = user;
    next();
  });
};

exports.signout = (req, res) => {
  res.clearCookie("t");
  res.json({ message: "Signout success" });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  userProperty: "auth",
});

exports.isAuth = (req, res, next) => {
  let user = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!user) {
    return res.status(403).json({
      error: "Access denied",
    });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role !== "admin") {
    return res.status(403).json({
      error: "Admin resourse! Access denied",
    });
  }
  next();
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.status(422).json({
      errors: firstError,
    });
  } else {
    User.findOne(
      {
        email,
      },
      (err, user) => {
        if (err || !user) {
          return res.status(400).json({
            error: "User with that email does not exist",
          });
        }

        const token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.JWT_RESET_PASSWORD,
          {
            expiresIn: "15m",
          }
        );

        const emailData = {
          from: process.env.EMAIL_FROM,
          to: email,
          subject: `Password Reset`,
          html: `
          <div style="border: 1px solid #000 ; border-radius: 10px; padding: 20px;">
            <br />
            <div class="card-header">
            <h1 style="color: #000000; text-align: center;"><b>Password Reset</b></h1>
            </div>
            <hr />
            <br />
            <div class="card-body">
              <h2 class="card-title" style="text-align: center; color: #000;">
              Hello <span style="color: #4169E1">${email}</span>, We received a request to reset your password.
              </h2>
                <p>Click on change password to reset your password.</p>
              <h3 class="card-text" style="text-align: center; color: #000;">
                By clicking on <b style="color: #4169E1;">Change Password</b>,
                you are accepting to change your previous password to a new one.
                This new password you are about to create will be used as
                your password while trying to signin.
              </h3>
              <center style="border-radius: 10px;"><a href="${process.env.CLIENT_URL}/users/password/reset/${token}" style="
              border: none;
              outline: 0;
              display: inline-block;
              padding: 15px;
              border-radius: 10px;
              color: #ffffff;
              background-color: #4169E1;
              text-align: center;
              cursor: pointer;
              font-size: 18px;
          "><b>Change Password</b></a></center>
          <br />
          <hr />
          <p>This message was sent to ${email} at your request.</p>
          </div>
          </div>`,
        };

        return user.updateOne(
          {
            resetPasswordLink: token,
          },
          (err, success) => {
            if (err) {
              console.log("RESET PASSWORD LINK ERROR", err);
              return res.status(400).json({
                error:
                  "Database connection error on user password forgot request",
              });
            } else {
              mg.messages()
                .send(emailData)
                .then((sent) => {
                  // console.log('SIGNUP EMAIL SENT', sent)
                  return res.json({
                    message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
                  });
                })
                .catch((err) => {
                  // console.log('SIGNUP EMAIL SENT ERROR', err)
                  return res.json({
                    message: err.message,
                  });
                });
            }
          }
        );
      }
    );
  }
};

exports.changePassword = (req, res) => {
  const { email } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.status(422).json({
      errors: firstError,
    });
  } else {
    User.findOne(
      {
        email,
      },
      (err, user) => {
        if (err || !user) {
          return res.status(400).json({
            error: "User with that email does not exist",
          });
        }

        const token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.JWT_RESET_PASSWORD,
          {
            expiresIn: "15m",
          }
        );

        const emailData = {
          from: process.env.EMAIL_FROM,
          to: email,
          subject: `Password Reset`,
          html: `
          <div style="border: 1px solid #000 ; border-radius: 10px; padding: 20px;">
            <br />
            <div class="card-header">
            <h1 style="color: #000000; text-align: center;"><b>Password Reset</b></h1>
            </div>
            <hr />
            <br />
            <div class="card-body">
              <h2 class="card-title" style="text-align: center; color: #000;">
              Hello <span style="color: #4169E1">${email}</span>, We received a request to reset your password.
              </h2>
                <p>Click on change password to reset your password.</p>
              <h3 class="card-text" style="text-align: center; color: #000;">
                By clicking on <b style="color: #4169E1;">Change Password</b>,
                you are accepting to change your previous password to a new one.
                This new password you are about to create will be used as
                your password while trying to signin.
              </h3>
              <center style="border-radius: 10px;"><a href="${process.env.CLIENT_URL}/users/password/reset/${token}" style="
              border: none;
              outline: 0;
              display: inline-block;
              padding: 15px;
              border-radius: 10px;
              color: #ffffff;
              background-color: #4169E1;
              text-align: center;
              cursor: pointer;
              font-size: 18px;
          "><b>Change Password</b></a></center>
          <br />
          <hr />
          <p>This message was sent to ${email} at your request.</p>
          </div>
          </div>`,
        };

        return user.updateOne(
          {
            resetPasswordLink: token,
          },
          (err, success) => {
            if (err) {
              console.log("RESET PASSWORD LINK ERROR", err);
              return res.status(400).json({
                error:
                  "Database connection error on user password forgot request",
              });
            } else {
              mg.messages()
                .send(emailData)
                .then((sent) => {
                  // console.log('SIGNUP EMAIL SENT', sent)
                  return res.json({
                    message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
                  });
                })
                .catch((err) => {
                  // console.log('SIGNUP EMAIL SENT ERROR', err)
                  return res.json({
                    message: err.message,
                  });
                });
            }
          }
        );
      }
    );
  }
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.status(422).json({
      errors: firstError,
    });
  } else {
    if (resetPasswordLink) {
      jwt.verify(
        resetPasswordLink,
        process.env.JWT_RESET_PASSWORD,
        function (err, decoded) {
          if (err) {
            return res.status(400).json({
              error: "Expired link. Try again",
            });
          }

          User.findOne(
            {
              resetPasswordLink,
            },
            (err, user) => {
              if (err || !user) {
                return res.status(400).json({
                  error: "Something went wrong. Try later",
                });
              }

              const updatedFields = {
                password: newPassword,
                resetPasswordLink: "",
              };

              user = _.extend(user, updatedFields);

              user.save((err, result) => {
                if (err) {
                  return res.status(400).json({
                    error: "Error resetting user password",
                  });
                }
                res.json({
                  message: `Great! Now you can login with your new password`,
                });
              });
            }
          );
        }
      );
    }
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT);
// Google Login
exports.google = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT })
    .then((response) => {
      // console.log('GOOGLE LOGIN RESPONSE',response)
      const { email_verified, name, email } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("ERROR GOOGLE LOGIN ON USER SAVE", err);
                return res.status(400).json({
                  error: "User signup failed with google",
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      } else {
        return res.status(400).json({
          error: "Google login failed. Try again",
        });
      }
    });
};

exports.facebook = (req, res) => {
  console.log("FACEBOOK LOGIN REQ BODY", req.body);
  const { userID, accessToken } = req.body;

  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

  return (
    fetch(url, {
      method: "GET",
    })
      .then((response) => response.json())
      // .then(response => console.log(response))
      .then((response) => {
        const { email, name } = response;
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("ERROR FACEBOOK LOGIN ON USER SAVE", err);
                return res.status(400).json({
                  error: "User signup failed with facebook",
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      })
      .catch((error) => {
        res.json({
          error: "Facebook login failed. Try later",
        });
      })
  );
};
