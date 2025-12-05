const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// /**
//  * @desc    Register a new user (Email/Password)
//  * @route   POST /api/auth/register
//  */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, profileImageUrl, adminInviteToken } = req.body;

        // 1. VALIDATION: Since password is not required in DB, we MUST check it here
        if (!password) {
            return res.status(400).json({ message: "Password is required for email registration." });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Determine user role
        let role = "member";
        if (adminInviteToken && adminInviteToken == process.env.ADMIN_INVITE_TOKEN) {
            role = "admin";
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            profileImageUrl: profileImageUrl,
            role
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// /**
//  * @desc    Login user (Email/Password)
//  * @route   POST /api/auth/login
//  */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 2. CHECK: If user registered via Google, they have no password.
        if (!user.password) {
            return res.status(400).json({ message: "This email is linked to Google. Please use Google Login." });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); 
    }
};

// /**
//  * @desc    Login OR Register with Google
//  * @route   POST /api/auth/google-login
//  */
const googleLogin = async (req, res) => {
    try {
        // 1. Extract adminInviteToken from the request
        const { email, name, googlePhotoUrl, adminInviteToken } = req.body;

        let user = await User.findOne({ email });

        if (user) {
            // User exists - Log them in
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                token: generateToken(user._id)
            });
        } else {
            // User DOES NOT exist - Create new user

            // 2. Check for Admin Token Logic
            let role = "member";
            if (adminInviteToken && adminInviteToken == process.env.ADMIN_INVITE_TOKEN) {
                role = "admin";
            }

            user = await User.create({
                name: name,
                email: email,
                profileImageUrl: googlePhotoUrl,
                role: role // <--- Apply the determined role
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role, // This will now be 'admin' if token matched
                profileImageUrl: user.profileImageUrl,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// /**
//  * @desc    Get user profile
//  * @route   GET /api/auth/profile
//  */
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// /**
//  * @desc    Update user profile
//  * @route   PUT /api/auth/profile
//  */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = req.body.name || user.name; 
        user.email = req.body.email || user.email;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profileImageUrl: updatedUser.profileImageUrl,
            role: updatedUser.role,
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Don't forget to export googleLogin!
module.exports = { registerUser, loginUser, googleLogin, getUserProfile, updateUserProfile };