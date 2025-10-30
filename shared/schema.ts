import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  jsonb,
  serial,
  customType
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
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const directories = pgTable("directories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  parentId: integer("parent_id").references((): any => directories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  directoryId: integer("directory_id").notNull().references(() => directories.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  filePath: text("file_path"),
  fileSize: integer("file_size").notNull(),
  format: text("format").notNull(),
  width: integer("width"),
  height: integer("height"),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  imageData: bytea("image_data"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

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
});

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
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDirectorySchema = createInsertSchema(directories).omit({
  id: true,
  createdAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  uploadedAt: true,
});

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

// Select types
export type Project = typeof projects.$inferSelect;
export type Directory = typeof directories.$inferSelect;
export type Image = typeof images.$inferSelect;
export type OcrResult = typeof ocrResults.$inferSelect;
export type ProcessingQueue = typeof processingQueue.$inferSelect;

// Insert types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertDirectory = z.infer<typeof insertDirectorySchema>;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;
export type InsertProcessingQueue = z.infer<typeof insertProcessingQueueSchema>;
