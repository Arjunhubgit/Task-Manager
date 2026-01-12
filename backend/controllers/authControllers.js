const User = require("../models/User");
const AdminInvite = require("../models/AdminInvite");
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
        const { name, email, password, profileImageUrl, inviteCode } = req.body;

        // 1. VALIDATION: Since password is not required in DB, we MUST check it here
        if (!password) {
            return res.status(400).json({ message: "Password is required for email registration." });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 2. Handle invite code validation and admin assignment
        let role = "member";
        let parentAdminId = null;

        if (inviteCode && inviteCode.trim() !== "") {
            // Verify the invite code
            const invite = await AdminInvite.findOne({ 
                inviteCode: inviteCode.toUpperCase() 
            });

            if (!invite) {
                return res.status(400).json({ message: "Invalid invite code" });
            }

            if (!invite.isActive) {
                return res.status(400).json({ message: "This invite has been deactivated" });
            }

            // Check if invite has expired
            if (invite.expiresAt && new Date() > invite.expiresAt) {
                await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
                return res.status(400).json({ message: "This invite has expired" });
            }

            // Check if max uses has been reached
            if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
                await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
                return res.status(400).json({ message: "This invite has reached its usage limit" });
            }

            // All validations passed - set the parent admin
            parentAdminId = invite.adminId;
            role = "member";

            // Mark invite as used
            await AdminInvite.findByIdAndUpdate(
                invite._id,
                {
                    $inc: { timesUsed: 1 },
                    $push: {
                        usedBy: {
                            userId: null, // Will be set after user creation
                        },
                    },
                }
            );
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
            role,
            parentAdminId, // Set the admin from invite
            isOnline: true
        });

        // Update the invite's usedBy with actual user ID
        if (inviteCode && inviteCode.trim() !== "") {
            await AdminInvite.updateOne(
                { inviteCode: inviteCode.toUpperCase(), "usedBy.userId": null },
                { $set: { "usedBy.$[elem].userId": user._id } },
                { arrayFilters: [{ "elem.userId": null }] }
            );
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            parentAdminId: user.parentAdminId,
            token: generateToken(user._id),
            message: "Registration successful!"
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        if (!user.password) {
            return res.status(400).json({ message: "This email is linked to Google. Please use Google Login." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

        // --- UPDATE: Explicitly set status to online ---
        user.isOnline = true;
        user.status = 'online'; 
        await user.save();

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

const googleLogin = async (req, res) => {
    try {
        const { email, name, googlePhotoUrl, inviteCode } = req.body;
        let user = await User.findOne({ email });

        if (user) {
            // --- UPDATE: Existing user logging in via Google ---
            user.isOnline = true;
            user.status = 'online'; 
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                parentAdminId: user.parentAdminId,
                isOnline: true,
                token: generateToken(user._id)
            });
        } else {
            // New user registration via Google
            let role = "member";
            let parentAdminId = null;

            // Handle invite code validation
            if (inviteCode && inviteCode.trim() !== "") {
                const invite = await AdminInvite.findOne({ 
                    inviteCode: inviteCode.toUpperCase() 
                });

                if (!invite) {
                    return res.status(400).json({ message: "Invalid invite code" });
                }

                if (!invite.isActive) {
                    return res.status(400).json({ message: "This invite has been deactivated" });
                }

                // Check if invite has expired
                if (invite.expiresAt && new Date() > invite.expiresAt) {
                    await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
                    return res.status(400).json({ message: "This invite has expired" });
                }

                // Check if max uses has been reached
                if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
                    await AdminInvite.findByIdAndUpdate(invite._id, { isActive: false });
                    return res.status(400).json({ message: "This invite has reached its usage limit" });
                }

                parentAdminId = invite.adminId;
                role = "member";
            }

            // --- UPDATE: Set status to online for new Google users ---
            user = await User.create({
                name: name,
                email: email,
                profileImageUrl: googlePhotoUrl,
                role: role,
                parentAdminId,
                isOnline: true,
                status: 'online'
            });

            // Mark invite as used if provided
            if (inviteCode && inviteCode.trim() !== "") {
                await AdminInvite.findOneAndUpdate(
                    { inviteCode: inviteCode.toUpperCase() },
                    {
                        $inc: { timesUsed: 1 },
                        $push: {
                            usedBy: {
                                userId: user._id,
                            },
                        },
                    }
                );
            }

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                parentAdminId: user.parentAdminId,
                profileImageUrl: user.profileImageUrl,
                token: generateToken(user._id),
                message: "Registration successful!"
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        // --- UPDATE: Set status to invisible immediately on logout ---
        await User.findByIdAndUpdate(req.user.id, { 
            isOnline: false,
            status: 'invisible', 
            lastLogoutTime: new Date()
        });
        
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// /**
//  * @desc    Login user (Email/Password)
//  * @route   POST /api/auth/login
//  */
// const loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         // 2. CHECK: If user registered via Google, they have no password.
//         if (!user.password) {
//             return res.status(400).json({ message: "This email is linked to Google. Please use Google Login." });
//         }

//         // Compare password
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }


//         user.isOnline = true;
//         await user.save();

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             profileImageUrl: user.profileImageUrl,
//             token: generateToken(user._id)
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// /**
//  * @desc    Login OR Register with Google
//  * @route   POST /api/auth/google-login
//  */
// const googleLogin = async (req, res) => {
//     try {
//         // 1. Extract adminInviteToken from the request
//         const { email, name, googlePhotoUrl, adminInviteToken } = req.body;

//         let user = await User.findOne({ email });

//         if (user) {

//             user.isOnline = true;
//             await user.save();
//             // User exists - Log them in
//             res.json({
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//                 profileImageUrl: user.profileImageUrl,
//                 isOnline: true,
//                 token: generateToken(user._id)

//             });
//         } else {
//             // User DOES NOT exist - Create new user

//             // 2. Check for Admin Token Logic
//             let role = "member";
//             if (adminInviteToken && adminInviteToken == process.env.ADMIN_INVITE_TOKEN) {
//                 role = "admin";
//             }

//             user = await User.create({
//                 name: name,
//                 email: email,
//                 profileImageUrl: googlePhotoUrl,
//                 role: role // <--- Apply the determined role
//             });

//             res.status(201).json({
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role, // This will now be 'admin' if token matched
//                 profileImageUrl: user.profileImageUrl,
//                 token: generateToken(user._id)
//             });
//         }
//     } catch (error) {
//         console.error("Google Auth Error:", error);
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

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

// /**
//  * @desc    Logout user
//  * @route   POST /api/auth/logout
// /**
//  * @desc    Host Login with Host Credentials
//  * @route   POST /api/auth/host-login
//  * @access  Public
//  */
const hostLogin = async (req, res) => {
    try {
        const { hostId, password } = req.body;

        // Validate credentials
        if (!hostId || !password) {
            return res.status(400).json({ message: "Host ID and password are required" });
        }

        // Check against hardcoded host credentials (can be moved to env for production)
        const REQUIRED_HOST_ID = process.env.HOST_ID || "Arjunhost";
        const REQUIRED_PASSWORD = process.env.HOST_PASSWORD || "arjunsharma@host007";

        if (hostId !== REQUIRED_HOST_ID || password !== REQUIRED_PASSWORD) {
            return res.status(401).json({ message: "Invalid Host ID or password" });
        }

        // Find or create the host user
        let user = await User.findOne({ email: "host@system.internal" });

        if (!user) {
            // Create host user if doesn't exist
            user = await User.create({
                name: "System Host",
                email: "host@system.internal",
                password: null,
                role: "host",
                isOnline: true,
                status: "online",
                googleId: null,
                profileImageUrl: null,
            });
        } else {
            // Update existing host user
            user.isOnline = true;
            user.status = "online";
            await user.save();
        }

        // Return token and user data
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: "host",
            profileImageUrl: user.profileImageUrl,
            isOnline: true,
            token: generateToken(user._id),
            message: "Host access granted - God Mode Active",
        });
    } catch (error) {
        console.error("Host login error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//  */
// const logoutUser = async (req, res) => {
//     try {
//         // Find the user and update both isOnline and status immediately
//         await User.findByIdAndUpdate(req.user.id, { 
//             isOnline: false,
//             status: 'invisible', // Changed to invisible immediately on logout
//             lastLogoutTime: new Date()
//         });
        
//         res.status(200).json({ success: true, message: "Logged out successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

module.exports = { registerUser, loginUser, googleLogin, getUserProfile, updateUserProfile, logoutUser, hostLogin };