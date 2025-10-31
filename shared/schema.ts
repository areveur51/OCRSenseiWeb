import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  jsonb,
  serial,
  customType,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom bytea type for storing binary data
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  },
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("projects_slug_idx").on(table.slug),
}));

export const directories = pgTable("directories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  path: text("path").notNull(),
  parentId: integer("parent_id").references((): any => directories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index("directories_project_id_idx").on(table.projectId),
  slugIdx: index("directories_slug_idx").on(table.projectId, table.slug),
}));

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  directoryId: integer("directory_id").notNull().references(() => directories.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  slug: text("slug").notNull(),
  filePath: text("file_path"),
  fileSize: integer("file_size").notNull(),
  format: text("format").notNull(),
  width: integer("width"),
  height: integer("height"),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  imageData: bytea("image_data"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
}, (table) => ({
  directoryIdIdx: index("images_directory_id_idx").on(table.directoryId),
  slugIdx: index("images_slug_idx").on(table.directoryId, table.slug),
}));

export const ocrResults = pgTable("ocr_results", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  pytesseractText: text("pytesseract_text"),
  pytesseractConfidence: integer("pytesseract_confidence"),
  easyocrText: text("easyocr_text"),
  easyocrConfidence: integer("easyocr_confidence"),
  consensusText: text("consensus_text"),
  consensusSource: text("consensus_source"),
  boundingBoxes: jsonb("bounding_boxes"),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (table) => ({
  imageIdIdx: index("ocr_results_image_id_idx").on(table.imageId),
}));

export const processingQueue = pgTable("processing_queue", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  imageIdIdx: index("processing_queue_image_id_idx").on(table.imageId),
  statusIdx: index("processing_queue_status_idx").on(table.status),
}));

export const monitoredSearches = pgTable("monitored_searches", {
  id: serial("id").primaryKey(),
  searchTerm: text("search_term").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  fuzzySearchVariations: integer("fuzzy_search_variations").notNull().default(2),
  ocrEngineMode: integer("ocr_engine_mode").notNull().default(1),
  ocrPsmConfig1: integer("ocr_psm_config1").notNull().default(6),
  ocrPsmConfig2: integer("ocr_psm_config2").notNull().default(3),
  ocrPreprocessing: integer("ocr_preprocessing").notNull().default(1),
  ocrUpscale: integer("ocr_upscale").notNull().default(1),
  ocrDenoise: integer("ocr_denoise").notNull().default(1),
  ocrDeskew: integer("ocr_deskew").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().optional(),
});

export const insertDirectorySchema = createInsertSchema(directories).omit({
  id: true,
  createdAt: true,
}).extend({
  slug: z.string().optional(),
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  uploadedAt: true,
}).extend({
  slug: z.string().optional(),
}).refine(
  (data) => !data.imageData || Buffer.isBuffer(data.imageData),
  {
    message: "imageData must be a Buffer instance",
    path: ["imageData"],
  }
);

export const insertOcrResultSchema = createInsertSchema(ocrResults).omit({
  id: true,
  processedAt: true,
});

export const insertProcessingQueueSchema = createInsertSchema(processingQueue).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertMonitoredSearchSchema = createInsertSchema(monitoredSearches).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
}).extend({
  fuzzySearchVariations: z.number().int().min(1).max(3).default(2),
});

export const updateSettingsSchema = z.object({
  fuzzySearchVariations: z.number().int().min(1).max(3).optional(),
  ocrEngineMode: z.number().int().min(0).max(3).optional(),
  ocrPsmConfig1: z.number().int().min(0).max(13).optional(),
  ocrPsmConfig2: z.number().int().min(0).max(13).optional(),
  ocrPreprocessing: z.number().int().min(0).max(1).optional(),
  ocrUpscale: z.number().int().min(0).max(1).optional(),
  ocrDenoise: z.number().int().min(0).max(1).optional(),
  ocrDeskew: z.number().int().min(0).max(1).optional(),
});

// Select types
export type Project = typeof projects.$inferSelect;
export type Directory = typeof directories.$inferSelect;
export type Image = typeof images.$inferSelect;
export type OcrResult = typeof ocrResults.$inferSelect;
export type ProcessingQueue = typeof processingQueue.$inferSelect;
export type MonitoredSearch = typeof monitoredSearches.$inferSelect;
export type Settings = typeof settings.$inferSelect;

// Insert types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertDirectory = z.infer<typeof insertDirectorySchema>;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;
export type InsertProcessingQueue = z.infer<typeof insertProcessingQueueSchema>;
export type InsertMonitoredSearch = z.infer<typeof insertMonitoredSearchSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
