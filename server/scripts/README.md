# Database Migration Scripts

## Cart Database Fix Script

### Overview
The `fixCarts.js` script performs a comprehensive migration of all carts in the database to ensure data integrity and consistency.

### What It Does

#### 1. **Fixes Existing Carts**
   - Sets default values for missing fields
   - Validates and corrects location data
   - Ensures items array structure is valid
   - Recalculates split amounts for members
   - Fixes platform, status, and other enum fields
   - Ensures creator is in members array

#### 2. **Deletes Invalid Carts**
   - Carts with non-existent creators
   - Expired carts (older than 7 days and not completed)
   - Carts with invalid or missing critical data

#### 3. **Default Values Applied**
   - `platform`: 'blinkit'
   - `deliveryCharge`: ₹50
   - `maxMembers`: 4
   - `status`: 'active'
   - `isPublic`: true
   - `maxDistance`: 2 km
   - `chatEnabled`: true
   - `totalOrders`: 0
   - `expiresAt`: 2 hours from now
   - `location.address`: 'Not specified'
   - `location.city`: 'Not specified'
   - `location.pincode`: '000000'

### How to Run

#### Option 1: Using npm script (Recommended)
```bash
cd server
npm run fix-carts
```

#### Option 2: Direct execution
```bash
cd server
node scripts/fixCarts.js
```

### Prerequisites
- MongoDB connection must be configured in `.env` file
- `MONGODB_URI` environment variable must be set
- Server dependencies must be installed (`npm install`)

### Output
The script provides detailed console output showing:
- Total carts found
- Each cart being processed with details of fixes applied
- Summary statistics (fixed, deleted, skipped, errors)
- Final cart count in database

### Example Output
```
🔍 Starting cart database migration...

📊 Found 15 carts in database

  - Setting default platform: blinkit
  - Fixed location from creator
  - Initialized empty items array
  - Recalculated split amounts: ₹25 per member
✅ Fixed cart 507f1f77bcf86cd799439011

⚠️  Cart 507f1f77bcf86cd799439012 has invalid creator - marking for deletion
🗑️  Deleted cart 507f1f77bcf86cd799439012

✓ Cart 507f1f77bcf86cd799439013 is valid - skipped

============================================================
📊 MIGRATION SUMMARY
============================================================
Total carts processed: 15
✅ Fixed: 8
🗑️  Deleted: 3
✓ Skipped (valid): 4
❌ Errors: 0
============================================================

✅ Final cart count in database: 12

✅ Migration completed successfully!
```

### Safety
- The script uses `findByIdAndUpdate` with `runValidators: false` to allow migration of invalid data
- Always backup your database before running migrations
- The script will not modify completed or delivered orders
- Each change is logged for transparency

### Troubleshooting

#### "MongoDB Connection Error"
- Verify `MONGODB_URI` in `.env` file
- Check network connectivity to MongoDB Atlas
- Ensure IP address is whitelisted in MongoDB Atlas

#### "Cannot find module '../models/Cart'"
- Ensure you're running the script from the `server` directory
- Check that all dependencies are installed

#### Script hangs or times out
- Check MongoDB Atlas connection status
- Verify database is not under maintenance
- Ensure sufficient MongoDB Atlas cluster resources

### Post-Migration
After running the migration:
1. Verify cart counts match expectations
2. Test cart creation on frontend
3. Test cart display functionality
4. Check that all location data is properly formatted

### Related Files
- **Model**: `server/models/Cart.js` - Cart schema definition
- **Controller**: `server/controllers/cartController.js` - Cart API endpoints
- **Frontend**: `client/pages/shared-carts.html` - Cart display page

### Notes
- This script is idempotent - safe to run multiple times
- Only carts with issues will be modified
- Valid carts are skipped to avoid unnecessary updates
- All changes are logged for audit purposes
