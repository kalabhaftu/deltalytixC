# Image Migration Script

## Purpose
One-time migration of all base64 images from database to Supabase storage.

## What it does:
1. ✅ Fetches all trades with base64 images
2. ✅ Creates ZIP backup of all images (in `backups/` folder)
3. ✅ Uploads each image to Supabase storage (**NO compression** - original quality)
4. ✅ Updates database with storage URLs
5. ✅ **Stops immediately if ANY error occurs** (safe rollback)

## Before running:

1. **Install required package:**
   ```bash
   npm install archiver @types/archiver --save-dev
   ```

2. **Make sure you have these env vars:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Create backups folder:**
   ```bash
   mkdir -p backups
   ```

## Run the migration:

```bash
npm run migrate:images
```

## What to expect:

```
🎯 IMAGE MIGRATION TOOL
==================================================
📊 Fetching trades with base64 images...
✅ Found 42 trades with base64 images

💾 Creating backup ZIP...
📦 Added 127 images to backup
✅ Backup created: backups/images-backup-2025-11-15.zip (245.32 MB)

🚀 Starting image migration...
📸 Total images to migrate: 127
✅ Migrated 127/127 images

🧹 Cleaning up base64 from database...
✅ Database cleanup complete

==================================================
✅ MIGRATION COMPLETED SUCCESSFULLY!
==================================================
📊 Total trades migrated: 42
📸 Total images migrated: 127
💾 Backup location: backups/images-backup-2025-11-15.zip

✅ All images are now in Supabase storage
✅ Database now stores URLs instead of base64

⚠️  Keep the backup file for at least 7 days before deleting
```

## If it fails:

- ❌ Migration stops immediately
- 💾 Your backup ZIP is safe
- 💡 Database may have some images migrated, some still base64
- 💡 You can run the script again - it will only migrate remaining base64 images

## After success:

1. ✅ Test your app - view trades with images
2. ✅ Verify images load correctly
3. ⚠️ **Keep backup ZIP for 7 days** before deleting
4. 🎉 Enjoy faster loading and smaller database!

## Storage reduction:

**Before migration:**
- Database: 500MB (with base64)
- Storage: 0 MB

**After migration:**
- Database: 50MB (just URLs, 90% smaller!)
- Storage: 100MB (actual images, served via CDN)

## Troubleshooting:

**Error: "Missing environment variables"**
- Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`

**Error: "Failed to create bucket"**
- Check Supabase dashboard - bucket permissions

**Error: "Storage upload failed"**
- Check Supabase storage quota
- Check internet connection

**Need to restore backup?**
- Extract the ZIP file
- Contact support if needed

