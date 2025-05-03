const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { upload } = require("../config/multer");
const asyncHandler = require("express-async-handler");
const { verifyUserToken } = require("../middleware/auth");
// Admin-only routes
router.get("/userslist", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send("Error fetching users");
  }
});

router.get("/users", 
  authController.protect,
  asyncHandler(async (req, res) => {
    const users = await User.find().select('-password -__v');
    res.status(200).json({ success: true, data: users });
  })
);

router.put("/users/:id",
  authController.protect,
  asyncHandler(async (req, res) => {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: req.body.approvalStatus },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    res.status(200).json({ success: true, data: updatedUser });
  })
);

// User profile routes (protected)
router.get("/profile",
  verifyUserToken,
  asyncHandler(userController.getUserProfile)
);

router.put("/profile",
  verifyUserToken,
  asyncHandler(userController.updateUserProfile)
);

// Avatar upload route
router.post("/profile/avatar",
  verifyUserToken,
  upload.single('avatar'),
  asyncHandler(userController.uploadAvatar)
);

// Existing user update route (keep or modify)
router.put("/users/:id/details",
  authController.protect,
  asyncHandler(async (req, res) => {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    res.status(200).json({ success: true, data: updatedUser });
  })
);

module.exports = router;