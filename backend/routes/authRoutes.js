const express = require("express");
// 1. FIX: Add 'googleLogin' to the destructured import list
const { 
  registerUser, 
  loginUser,
  logoutUser, 
  googleLogin, 
  getUserProfile, 
  updateUserProfile,
  hostLogin
} = require("../controllers/authControllers");

const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { uploadBufferImageToCloudinary } = require("../utils/cloudinaryUpload");


// Auth Routes
router.post("/register", registerUser); 
router.post("/login", loginUser); 
router.post('/logout', protect, logoutUser);

// 2. FIX: Use the function name directly (not authController.googleLogin)
router.post("/google-login", googleLogin);

// Host Login Route
router.post("/host-login", hostLogin);

router.get("/profile", protect, getUserProfile); 
router.put("/profile", protect, updateUserProfile); 

// Image Upload Route
router.post("/upload-image", (req, res, next) => {
    upload.single("image")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || "File upload failed" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        try {
            const uploadedImage = await uploadBufferImageToCloudinary({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                folder: "taskmanager/profile-pictures"
            });

            return res.status(200).json({ imageUrl: uploadedImage.secure_url });
        } catch (uploadError) {
            console.error("Profile image Cloudinary upload failed:", uploadError.message);
            return res.status(500).json({
                message: "Image upload failed. Please verify Cloudinary configuration.",
                error: uploadError.message
            });
        }
    });
});

module.exports = router;
