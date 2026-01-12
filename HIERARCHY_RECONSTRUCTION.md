# User Management System Hierarchy Reconstruction

## Overview
The User Management System has been restructured to support a three-tier hierarchical model:

```
HOST (Root Administrator)
├── ADMIN (Team Leads - manages multiple members)
│   └── MEMBER (Team Members - performs tasks)
└── ADMIN (Team Leads)
    └── MEMBER (Team Members)
```

---

## Changes Made

### 1. ✅ User Model Update
**File:** `backend/models/User.js`

Added two new fields to establish parent-child relationships:

```javascript
// Hierarchy relationships
parentHostId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null, // Only set for ADMIN users
},

parentAdminId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null, // Only set for MEMBER users
},
```

**Purpose:**
- `parentHostId`: Links an ADMIN to their managing HOST
- `parentAdminId`: Links a MEMBER to their managing ADMIN

---

### 2. ✅ Authentication Middleware Enhanced
**File:** `backend/middlewares/authMiddleware.js`

Added four new middleware functions:

#### `adminOrHost(req, res, next)`
Allows both ADMIN and HOST to access routes
```javascript
// Usage: router.get("/", protect, adminOrHost, getUsers);
```

#### `canManageMember(req, res, next)`
Verifies ADMIN can only manage their own members
```javascript
// Ensures admin.memberAdminId === currentAdmin._id
// HOST bypasses this check
```

#### `canManageAdmin(req, res, next)`
Verifies HOST can only manage their own admins
```javascript
// Ensures admin.parentHostId === currentHost._id
```

---

### 3. ✅ User Controllers Updated
**File:** `backend/controllers/userControllers.js`

#### New Function: `createAdmin(req, res)`
- **Route:** `POST /api/users/admin`
- **Access:** HOST only
- **Action:** Creates a new ADMIN and assigns parentHostId
```javascript
{
  name: "John Admin",
  email: "john@company.com",
  password: "hashedPassword",
  role: "admin",
  parentHostId: "hostId123" // Auto-set from req.user
}
```

#### Updated Function: `createMember(req, res)`
- **Route:** `POST /api/users/`
- **Access:** ADMIN only
- **Change:** Now sets `parentAdminId` instead of hardcoding admin role
```javascript
{
  name: "Jane Member",
  email: "jane@company.com",
  password: "hashedPassword",
  role: "member",
  parentAdminId: "adminId456" // Auto-set from req.user
}
```

#### Updated Function: `getUsers(req, res)`
**Role-based filtering:**

| Role | Returns |
|------|---------|
| **HOST** | All ADMIN users under them (where parentHostId matches) |
| **ADMIN** | All MEMBER users under them (where parentAdminId matches) |
| **MEMBER** | Error - Members cannot view user list |

---

### 4. ✅ User Routes Restructured
**File:** `backend/routes/userRoutes.js`

#### HOST Routes (Manage Admins)
```javascript
POST   /api/users/admin              // Create new ADMIN
GET    /api/users/                   // Get all their ADMINS
```

#### ADMIN Routes (Manage Members)
```javascript
POST   /api/users/                   // Create new MEMBER
DELETE /api/users/:id                // Delete their MEMBER
PUT    /api/users/:id                // Update their MEMBER status
```

#### General Routes
```javascript
GET    /api/users/for-messaging      // Get users for chat
GET    /api/users/:id                // Get specific user
```

---

## Request/Response Examples

### Example 1: HOST Creates an ADMIN
```bash
POST /api/users/admin
Authorization: Bearer <host_token>
Content-Type: application/json

{
  "name": "Team Lead A",
  "email": "teamlead.a@company.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "_id": "admin_001",
  "name": "Team Lead A",
  "email": "teamlead.a@company.com",
  "role": "admin",
  "parentHostId": "host_001",
  "message": "Admin created successfully!"
}
```

---

### Example 2: ADMIN Creates a MEMBER
```bash
POST /api/users/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Team Member A",
  "email": "member.a@company.com",
  "password": "memberPassword123"
}
```

**Response (201):**
```json
{
  "_id": "member_001",
  "name": "Team Member A",
  "email": "member.a@company.com",
  "role": "member",
  "parentAdminId": "admin_001",
  "message": "Member added successfully!"
}
```

---

### Example 3: HOST Gets All Their ADMINS
```bash
GET /api/users/
Authorization: Bearer <host_token>
```

**Response:**
```json
[
  {
    "_id": "admin_001",
    "name": "Team Lead A",
    "email": "teamlead.a@company.com",
    "role": "admin",
    "parentHostId": "host_001",
    "status": "online",
    "pendingTasks": 5,
    "inProgressTasks": 2,
    "completedTasks": 10
  },
  {
    "_id": "admin_002",
    "name": "Team Lead B",
    "email": "teamlead.b@company.com",
    "role": "admin",
    "parentHostId": "host_001",
    "status": "offline",
    "pendingTasks": 3,
    "inProgressTasks": 1,
    "completedTasks": 8
  }
]
```

---

### Example 4: ADMIN Gets All Their MEMBERS
```bash
GET /api/users/
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "_id": "member_001",
    "name": "Team Member A",
    "email": "member.a@company.com",
    "role": "member",
    "parentAdminId": "admin_001",
    "status": "online",
    "pendingTasks": 3,
    "inProgressTasks": 2,
    "completedTasks": 15
  },
  {
    "_id": "member_002",
    "name": "Team Member B",
    "email": "member.b@company.com",
    "role": "member",
    "parentAdminId": "admin_001",
    "status": "idle",
    "pendingTasks": 1,
    "inProgressTasks": 3,
    "completedTasks": 12
  }
]
```

---

## Access Control Summary

| Operation | HOST | ADMIN | MEMBER |
|-----------|------|-------|--------|
| Create ADMIN | ✅ | ❌ | ❌ |
| View all ADMINS | ✅ | ❌ | ❌ |
| Delete ADMIN | ✅ | ❌ | ❌ |
| Create MEMBER | ❌ | ✅ | ❌ |
| View own MEMBERS | ❌ | ✅ | ❌ |
| Delete own MEMBER | ❌ | ✅ | ❌ |
| View user list | ✅ | ✅ | ❌ |
| Update status | ✅ | ✅ (own) | ✅ (own) |

---

## Important Notes

### Data Integrity
- HOSTs cannot create MEMBERs directly
- ADMINs cannot create other ADMINs
- MEMBERs are isolated to their parent ADMIN
- ADMINs are isolated to their parent HOST

### Database Migration (If Needed)
For existing users, you may need to run a migration script:
```javascript
// Example: Convert all existing admins to HOST-managed
db.users.updateMany(
  { role: "admin" },
  { $set: { parentHostId: hostId } }
);

// Example: Convert all existing members to ADMIN-managed
db.users.updateMany(
  { role: "member" },
  { $set: { parentAdminId: adminId } }
);
```

---

## Testing Workflow

### Test Case 1: Create Hierarchy
1. Login as HOST
2. Create ADMIN "TeamLeadA"
3. Logout HOST, login as ADMIN "TeamLeadA"
4. Create MEMBER "TeamMemberA1"
5. Verify parentAdminId is set correctly

### Test Case 2: Access Control
1. ADMIN tries to create another ADMIN → Should fail (403)
2. MEMBER tries to view users → Should fail (403)
3. HOST tries to delete MEMBER directly → Should work if override logic added

### Test Case 3: Data Isolation
1. ADMIN-A gets users → Should see only their MEMBERS
2. ADMIN-B gets users → Should see different MEMBERS
3. HOST gets users → Should see all ADMINS

---

## Files Modified

1. ✅ `backend/models/User.js` - Added hierarchy fields
2. ✅ `backend/controllers/userControllers.js` - Updated controllers with role-based logic
3. ✅ `backend/middlewares/authMiddleware.js` - Added hierarchy middlewares
4. ✅ `backend/routes/userRoutes.js` - Reorganized routes with proper access control

---

## Next Steps

1. **Test the hierarchy** with different roles
2. **Update Task assignment** to respect admin-member relationships
3. **Update Messaging routes** to support the new hierarchy
4. **Update Notification system** to work with the hierarchy
5. **Add frontend UI** for admin creation workflow
6. **Database migration** if you have existing data

