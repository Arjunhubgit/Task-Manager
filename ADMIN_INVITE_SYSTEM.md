# Admin Invite System - Complete Implementation Guide

## Overview
A secure invite-based system that allows ADMINs to generate invite links/codes for new team members. When users register with a valid invite code, they automatically get assigned to the inviting admin as their parent.

```
Admin generates invite link
        ↓
User signs up with invite code
        ↓
User automatically becomes MEMBER under that ADMIN
        ↓
ADMIN can view and manage all their team members
```

---

## Architecture

### Database Models

#### 1. AdminInvite Schema
**File:** `backend/models/AdminInvite.js`

```javascript
{
  adminId: ObjectId,              // Reference to ADMIN who created invite
  inviteCode: String,             // Unique code (e.g., "A1B2C3D4E5F6")
  inviteLink: String,             // Full URL (e.g., "https://app.com/signup?invite=ABC123")
  maxUses: Number,                // null = unlimited, or specific number
  timesUsed: Number,              // How many times used
  expiresAt: Date,                // null = never expires
  isActive: Boolean,              // Can be deactivated manually
  description: String,            // "Q1 Project Team", etc.
  usedBy: [{                      // Track who used this invite
    userId: ObjectId,
    usedAt: Date
  }],
  timestamps: true
}
```

---

### Backend Implementation

#### 1. Controllers: `inviteControllers.js`

**generateInviteLink()**
- Generate unique 16-character code
- Create full invite URL
- Support optional expiry and max uses
- Returns invite code and full link

```javascript
POST /api/invites/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "description": "Q1 Project Team",
  "maxUses": 5,           // Optional: limit to 5 members
  "expiresInDays": 30     // Optional: expire in 30 days
}

Response (201):
{
  "success": true,
  "data": {
    "_id": "123abc",
    "inviteCode": "A1B2C3D4E5F6",
    "inviteLink": "https://app.com/signup?invite=A1B2C3D4E5F6",
    "description": "Q1 Project Team",
    "maxUses": 5,
    "expiresAt": "2026-02-11T00:00:00Z",
    "isActive": true,
    "timesUsed": 0
  }
}
```

**getMyInvites()**
- Get all invites created by current ADMIN
- Show usage statistics
- Show who used each invite

```javascript
GET /api/invites/my-invites
Authorization: Bearer <admin_token>

Response (200):
{
  "success": true,
  "total": 3,
  "data": [
    {
      "_id": "123abc",
      "inviteCode": "A1B2C3D4",
      "description": "Q1 Team",
      "maxUses": 10,
      "timesUsed": 5,
      "isActive": true,
      "expiresAt": "2026-02-15T00:00:00Z",
      "usedBy": [
        {
          "userId": { "name": "John Doe", "email": "john@example.com" },
          "usedAt": "2026-01-12T10:30:00Z"
        }
      ]
    }
  ]
}
```

**verifyInvite()**
- Public endpoint (no auth required)
- Validate invite code before signup
- Check expiry, max uses, active status
- Return admin details

```javascript
GET /api/invites/verify/:inviteCode
// No authentication required

Response (200):
{
  "success": true,
  "data": {
    "_id": "123abc",
    "inviteCode": "A1B2C3D4",
    "adminId": "456def",
    "adminName": "John Admin",
    "adminEmail": "admin@example.com",
    "description": "Q1 Project Team",
    "isValid": true
  }
}

Response (400):
{
  "success": false,
  "message": "This invite has expired" | "Invalid invite code" | "Max usage reached"
}
```

**deactivateInvite()**
- Deactivate a specific invite
- Prevents further signups

```javascript
PUT /api/invites/:inviteId/deactivate
Authorization: Bearer <admin_token>

Response (200):
{
  "success": true,
  "message": "Invite deactivated successfully"
}
```

**deleteInvite()**
- Permanently delete an invite

```javascript
DELETE /api/invites/:inviteId
Authorization: Bearer <admin_token>

Response (200):
{
  "success": true,
  "message": "Invite deleted successfully"
}
```

---

#### 2. Updated Auth Controllers

**registerUser() - Updated**
- Accept `inviteCode` parameter
- Validate invite code before user creation
- Automatically set `parentAdminId` from invite
- Mark invite as used

```javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Member",
  "email": "member@example.com",
  "password": "securePass123",
  "profileImageUrl": "https://...",
  "inviteCode": "A1B2C3D4E5F6"  // NEW: Optional invite code
}

Response (201):
{
  "_id": "user123",
  "name": "John Member",
  "email": "member@example.com",
  "role": "member",
  "parentAdminId": "admin456",     // Auto-set from invite
  "token": "jwt_token",
  "message": "Registration successful!"
}
```

**googleLogin() - Updated**
- Also supports `inviteCode`
- Same validation logic

```javascript
POST /api/auth/google-login
Content-Type: application/json

{
  "name": "John Member",
  "email": "member@example.com",
  "googlePhotoUrl": "https://...",
  "inviteCode": "A1B2C3D4E5F6"  // NEW: Optional invite code
}
```

---

### Routes: `inviteRoutes.js`

```javascript
// Admin Routes (Protected + Admin only)
POST   /api/invites/generate           // Create new invite
GET    /api/invites/my-invites         // Get all admin's invites
PUT    /api/invites/:inviteId/deactivate  // Deactivate invite
DELETE /api/invites/:inviteId          // Delete invite

// Public Routes (No auth)
GET    /api/invites/verify/:inviteCode // Verify invite code
```

---

### Frontend Implementation

#### 1. Enhanced SignUp Component
**File:** `frontend/Daily-track-App/src/pages/Auth/SignUp.jsx`

**Features:**
- Auto-fill invite code from URL query parameter (`?invite=CODE`)
- Real-time invite validation with visual feedback
- Support for both invite code and full invite link
- Green checkmark for valid invites
- Red error for invalid invites

**State Management:**
```javascript
inviteCode: '',                    // User input
inviteValidation: {                // Validation status
  status: 'valid' | 'invalid' | null,
  message: '',
  adminName: ''
}
```

**Validation Flow:**
1. User pastes invite code/link
2. Component extracts code
3. Debounced API call to `/api/invites/verify/:code`
4. Display validation result
5. Allow signup only if valid

**Code Extraction:**
- Direct code: `ABC123` → use as is
- Full link: `https://app.com/signup?invite=ABC123` → extract `ABC123`

---

#### 2. Admin Invite Manager Component
**File:** `frontend/Daily-track-App/src/components/AdminInviteManager.jsx`

**Features:**
- Generate new invites with form modal
- View all created invites
- Copy invite code/link to clipboard
- Deactivate invites
- Delete invites
- View usage statistics and who joined
- Real-time usage progress bar
- Expiry status indicator

**Key Functions:**

**generateInviteLink()**
```javascript
Form Fields:
- Description (optional): "Q1 Project Team"
- Max Uses (optional): 5, 10, unlimited
- Expires In (optional): 7, 30, 90 days

On Success:
- Add new invite to list
- Show success message
- Close modal
- Auto-fetch updated invites
```

**copyToClipboard()**
- Copy invite code or full link
- Visual feedback: "Copied!" message

**handleDeactivateInvite()**
- Prevent further usage
- Keep historical data

**handleDeleteInvite()**
- Permanently remove invite
- Confirmation dialog

---

## Flow Examples

### Example 1: Admin Generates Invite

**Step 1: Admin navigates to Invite Manager**
```
Dashboard → Admin Settings → Invite Manager
```

**Step 2: Click "Generate Invite"**
```
Modal opens with form
```

**Step 3: Fill form**
```
Description: "February Onboarding"
Max Uses: 10
Expires In: 30 days
```

**Step 4: Click "Generate"**
```
API: POST /api/invites/generate
Response: Invite code "A1B2C3D4E5F6" + Full link
```

**Step 5: Copy and share**
```
Admin copies: "https://app.com/signup?invite=A1B2C3D4E5F6"
Sends to team member via email/Slack
```

---

### Example 2: User Joins via Invite

**Step 1: User receives invite link**
```
Email: "Join our team: https://app.com/signup?invite=A1B2C3D4E5F6"
```

**Step 2: User clicks link**
```
Redirects to SignUp page
URL: /signup?invite=A1B2C3D4E5F6
```

**Step 3: SignUp page auto-validates**
```
Extracts code from URL
Shows: "Valid invite from John Admin" ✓
```

**Step 4: User fills form**
```
Name: Jane Member
Email: jane@example.com
Password: ****
Invite: Auto-filled and validated
```

**Step 5: User clicks "Create Account"**
```
API: POST /api/auth/register
Payload: { name, email, password, inviteCode: "A1B2C3D4" }
```

**Step 6: Backend processes**
```
1. Validate invite code
2. Check expiry/max uses
3. Create user with parentAdminId = admin456
4. Mark invite as used
5. Return JWT token
```

**Step 7: User redirected to dashboard**
```
As MEMBER, sees their ADMIN's tasks and team
```

---

### Example 3: Viewing Who Joined

**Admin navigates to Invite Manager**
```
Shows all generated invites with:
- Invite code
- Full link
- Max uses vs times used
- List of members who used it
- Expiry date
- Active/Inactive status
```

---

## Security Features

### 1. Invite Code Security
- **Unique codes**: 16-character hex strings (2^128 combinations)
- **Cannot be guessed**: Cryptographically secure random generation
- **Case-insensitive**: Allows flexibility in sharing

### 2. Access Control
- **Only ADMIN can generate**: `adminOnly` middleware
- **Only invite owner can manage**: Verify `adminId` matches
- **Public verification only**: `/verify` endpoint doesn't reveal admin details

### 3. Expiry Protection
- **Auto-expire**: Invites expire after specified date
- **Auto-deactivate**: Invites deactivate after max uses reached
- **Grace period**: No timezone issues due to server-side validation

### 4. Invitation Tracking
- **Who used**: Track each user who used invite
- **When used**: Timestamp of usage
- **Audit trail**: Complete history maintained

---

## API Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/invites/generate` | Admin | Create new invite |
| GET | `/api/invites/my-invites` | Admin | Get all invites |
| GET | `/api/invites/verify/:code` | Public | Verify invite validity |
| PUT | `/api/invites/:id/deactivate` | Admin | Deactivate invite |
| DELETE | `/api/invites/:id` | Admin | Delete invite |
| POST | `/api/auth/register` | Public | Register with invite |
| POST | `/api/auth/google-login` | Public | Google login with invite |

---

## Database Indexes

Created for performance:
```javascript
inviteCode: 1          // Fast code lookup
adminId: 1             // Fast admin invites lookup
inviteLink: 1          // Fast link lookup
```

---

## Integration Checklist

- ✅ AdminInvite model created
- ✅ Invite controllers implemented
- ✅ Invite routes added
- ✅ Auth controllers updated
- ✅ Server routes registered
- ✅ SignUp component enhanced
- ✅ AdminInviteManager component created
- ⚠️ **TODO: Add AdminInviteManager to Admin Dashboard**
- ⚠️ **TODO: Test full signup flow with invites**
- ⚠️ **TODO: Set FRONTEND_URL in .env**

---

## Environment Variables

Add to `.env`:
```
FRONTEND_URL=http://localhost:5173  # For generating invite links
```

---

## Usage Tips

### For Admins:
1. Generate invites with specific limits (e.g., 5 people max)
2. Set expiry dates for time-sensitive onboarding
3. Share via email/Slack with full link
4. Monitor who joins in real-time
5. Deactivate invites when not needed

### For Users:
1. Use invite link directly (easiest)
2. Or paste code in "Admin Invite" field
3. Green checkmark confirms valid invite
4. Registration completes automatically after signup
5. Immediately see admin's tasks in dashboard

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid invite code" | Check code spelling, expired date, max uses |
| "This invite has been deactivated" | Admin disabled it, ask for new one |
| "This invite has expired" | Date passed, ask admin for new invite |
| "Max usage reached" | Invite at limit, ask admin for new one |
| User not assigned to admin | Check parentAdminId set in registration response |
| Invite not appearing in manager | Refresh page, check admin ID |

---

## Future Enhancements

1. **Bulk Invites**: Generate multiple codes at once
2. **Invite Analytics**: Charts showing signup trends
3. **Resend Invites**: Send reminder emails
4. **Role-specific Invites**: Create invites for different roles
5. **Team Templates**: Pre-configured invite sets
6. **Invite Notifications**: Real-time signup alerts to admin

