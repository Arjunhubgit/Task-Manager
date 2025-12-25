const express = require("express");
// 1. FIX: Add 'googleLogin' to the destructured import list
const { 
  registerUser, 
  loginUser,
  logoutUser, 
  googleLogin, 
  getUserProfile, 
  updateUserProfile 
} = require("../controllers/authControllers");

const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");


// Auth Routes
router.post("/register", registerUser); 
router.post("/login", loginUser); 
router.post('/logout', protect, logoutUser);

// 2. FIX: Use the function name directly (not authController.googleLogin)
router.post("/google-login", googleLogin); 

router.get("/profile", protect, getUserProfile); 
router.put("/profile", protect, updateUserProfile); 

// Image Upload Route
router.post("/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
});

module.exports = router;