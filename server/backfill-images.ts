#!/usr/bin/env tsx
import { db } from "./db";
import { images } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { readFile, access } from "fs/promises";
import { resolve } from "path";
import { constants } from "fs";

/**
 * Backfill script to migrate existing images from filesystem to database
 * Reads files from disk and stores them in the image_data column
 */
async function backfillImages() {
  console.log("🔄 Starting image backfill process...\n");

  try {
    // Get all images that don't have imageData yet
    const imagesToBackfill = await db
      .select()
      .from(images)
      .where(isNull(images.imageData));

    console.log(`Found ${imagesToBackfill.length} images to backfill\n`);

    if (imagesToBackfill.length === 0) {
      console.log("✅ No images need backfilling!");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const image of imagesToBackfill) {
      try {
        if (!image.filePath) {
          console.log(`⚠️  Image ${image.id} has no file path, skipping...`);
          failCount++;
          continue;
        }

        const filePath = resolve(process.cwd(), "uploads", image.filePath);
        
        // Check if file exists
        try {
          await access(filePath, constants.R_OK);
        } catch {
          console.log(`❌ File not found for image ${image.id}: ${filePath}`);
          failCount++;
          continue;
        }

        // Read file into buffer
        const fileBuffer = await readFile(filePath);
        
        // Update database with image data
        await db
          .update(images)
          .set({ imageData: fileBuffer })
          .where(eq(images.id, image.id));

        console.log(`✅ Backfilled image ${image.id}: ${image.filename} (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
        successCount++;

      } catch (error: any) {
        console.log(`❌ Error backfilling image ${image.id}: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 Backfill Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📝 Total: ${imagesToBackfill.length}\n`);

  } catch (error: any) {
    console.error("❌ Fatal error during backfill:", error.message);
    process.exit(1);
  }
}

// Run the backfill
backfillImages()
  .then(() => {
    console.log("✨ Backfill complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Backfill failed:", error);
    process.exit(1);
  });
