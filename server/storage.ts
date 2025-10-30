import { db } from "./db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import {
  projects,
  directories,
  images,
  ocrResults,
  processingQueue,
  type Project,
  type Directory,
  type Image,
  type OcrResult,
  type ProcessingQueue,
  type InsertProject,
  type InsertDirectory,
  type InsertImage,
  type InsertOcrResult,
  type InsertProcessingQueue,
} from "@shared/schema";

export interface IStorage {
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Directories
  getDirectoriesByProject(projectId: number): Promise<Directory[]>;
  getDirectory(id: number): Promise<Directory | undefined>;
  createDirectory(directory: InsertDirectory): Promise<Directory>;
  updateDirectory(id: number, updates: Partial<InsertDirectory>): Promise<Directory | undefined>;
  deleteDirectory(id: number): Promise<boolean>;

  // Images
  getImagesByDirectory(directoryId: number): Promise<Image[]>;
  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: number): Promise<boolean>;

  // OCR Results
  getOcrResultByImage(imageId: number): Promise<OcrResult | undefined>;
  createOcrResult(result: InsertOcrResult): Promise<OcrResult>;

  // Processing Queue
  getQueuedItems(): Promise<ProcessingQueue[]>;
  getQueueItem(id: number): Promise<ProcessingQueue | undefined>;
  getQueueItemByImage(imageId: number): Promise<ProcessingQueue | undefined>;
  createQueueItem(item: InsertProcessingQueue): Promise<ProcessingQueue>;
  updateQueueItem(id: number, updates: Partial<ProcessingQueue>): Promise<ProcessingQueue | undefined>;

  // Search
  searchText(query: string): Promise<Array<{ image: Image; ocrResult: OcrResult }>>;

  // Statistics
  getProjectStats(projectId: number): Promise<{
    totalImages: number;
    processedImages: number;
    totalDirectories: number;
  }>;
}

export class DbStorage implements IStorage {
  // Projects
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Directories
  async getDirectoriesByProject(projectId: number): Promise<Directory[]> {
    return db.select().from(directories).where(eq(directories.projectId, projectId));
  }

  async getDirectory(id: number): Promise<Directory | undefined> {
    const [directory] = await db.select().from(directories).where(eq(directories.id, id));
    return directory;
  }

  async createDirectory(directory: InsertDirectory): Promise<Directory> {
    const [newDirectory] = await db.insert(directories).values(directory).returning();
    return newDirectory;
  }

  async updateDirectory(id: number, updates: Partial<InsertDirectory>): Promise<Directory | undefined> {
    const [updated] = await db
      .update(directories)
      .set(updates)
      .where(eq(directories.id, id))
      .returning();
    return updated;
  }

  async deleteDirectory(id: number): Promise<boolean> {
    const result = await db.delete(directories).where(eq(directories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Images
  async getImagesByDirectory(directoryId: number): Promise<Image[]> {
    return db.select().from(images).where(eq(images.directoryId, directoryId));
  }

  async getImage(id: number): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async deleteImage(id: number): Promise<boolean> {
    const result = await db.delete(images).where(eq(images.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // OCR Results
  async getOcrResultByImage(imageId: number): Promise<OcrResult | undefined> {
    const [result] = await db.select().from(ocrResults).where(eq(ocrResults.imageId, imageId));
    return result;
  }

  async createOcrResult(result: InsertOcrResult): Promise<OcrResult> {
    const [newResult] = await db.insert(ocrResults).values(result).returning();
    return newResult;
  }

  // Processing Queue
  async getQueuedItems(): Promise<ProcessingQueue[]> {
    return db
      .select()
      .from(processingQueue)
      .where(eq(processingQueue.status, "pending"))
      .orderBy(desc(processingQueue.priority), processingQueue.createdAt);
  }

  async getQueueItem(id: number): Promise<ProcessingQueue | undefined> {
    const [item] = await db.select().from(processingQueue).where(eq(processingQueue.id, id));
    return item;
  }

  async getQueueItemByImage(imageId: number): Promise<ProcessingQueue | undefined> {
    const [item] = await db.select().from(processingQueue).where(eq(processingQueue.imageId, imageId));
    return item;
  }

  async createQueueItem(item: InsertProcessingQueue): Promise<ProcessingQueue> {
    const [newItem] = await db.insert(processingQueue).values(item).returning();
    return newItem;
  }

  async updateQueueItem(id: number, updates: Partial<ProcessingQueue>): Promise<ProcessingQueue | undefined> {
    const [updated] = await db
      .update(processingQueue)
      .set(updates)
      .where(eq(processingQueue.id, id))
      .returning();
    return updated;
  }

  // Search
  async searchText(query: string): Promise<Array<{ image: Image; ocrResult: OcrResult }>> {
    const results = await db
      .select({
        image: images,
        ocrResult: ocrResults,
      })
      .from(ocrResults)
      .innerJoin(images, eq(images.id, ocrResults.imageId))
      .where(like(ocrResults.consensusText, `%${query}%`));
    
    return results;
  }

  // Statistics
  async getProjectStats(projectId: number): Promise<{
    totalImages: number;
    processedImages: number;
    totalDirectories: number;
  }> {
    const dirs = await this.getDirectoriesByProject(projectId);
    const dirIds = dirs.map(d => d.id);

    let totalImages = 0;
    let processedImages = 0;

    if (dirIds.length > 0) {
      const [imageStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(images)
        .where(sql`${images.directoryId} = ANY(${dirIds})`);

      totalImages = imageStats?.total || 0;

      if (totalImages > 0) {
        const [processedStats] = await db
          .select({
            processed: sql<number>`count(*)::int`,
          })
          .from(ocrResults)
          .innerJoin(images, eq(images.id, ocrResults.imageId))
          .where(sql`${images.directoryId} = ANY(${dirIds})`);

        processedImages = processedStats?.processed || 0;
      }
    }

    return {
      totalImages,
      processedImages,
      totalDirectories: dirs.length,
    };
  }
}

export const storage = new DbStorage();
