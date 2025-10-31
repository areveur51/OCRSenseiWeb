import { db } from "./db";
import { eq, desc, and, like, ilike, or, sql, inArray, not } from "drizzle-orm";
import { generateUniqueSlug } from "@shared/slugs";
import {
  projects,
  directories,
  images,
  ocrResults,
  processingQueue,
  monitoredSearches,
  settings,
  type Project,
  type Directory,
  type Image,
  type OcrResult,
  type ProcessingQueue,
  type MonitoredSearch,
  type Settings,
  type InsertProject,
  type InsertDirectory,
  type InsertImage,
  type InsertOcrResult,
  type InsertProcessingQueue,
  type InsertMonitoredSearch,
  type UpdateSettings,
} from "@shared/schema";

export interface IStorage {
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Directories
  getDirectoriesByProject(projectId: number): Promise<Directory[]>;
  getDirectory(id: number): Promise<Directory | undefined>;
  getDirectoryBySlug(projectId: number, slug: string): Promise<Directory | undefined>;
  createDirectory(directory: InsertDirectory): Promise<Directory>;
  updateDirectory(id: number, updates: Partial<InsertDirectory>): Promise<Directory | undefined>;
  deleteDirectory(id: number): Promise<boolean>;
  updateDirectoryOrder(directoryId: number, newSortOrder: number): Promise<boolean>;

  // Images
  getImagesByDirectory(directoryId: number): Promise<Image[]>;
  getImage(id: number): Promise<Image | undefined>;
  getImageBySlug(directoryId: number, slug: string): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  updateImage(id: number, updates: Partial<InsertImage>): Promise<Image | undefined>;
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

  // Monitored Searches
  getMonitoredSearches(): Promise<Array<MonitoredSearch & { resultCount: number }>>;
  createMonitoredSearch(search: InsertMonitoredSearch): Promise<MonitoredSearch>;
  deleteMonitoredSearch(id: number): Promise<boolean>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: UpdateSettings): Promise<Settings>;

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

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    // If name is being updated, regenerate slug
    if (updates.name) {
      const { generateSlug } = await import("@shared/slugs");
      const baseSlug = generateSlug(updates.name);
      
      // Get existing project slugs (excluding current project)
      const allProjects = await db
        .select()
        .from(projects)
        .where(not(eq(projects.id, id)));
      const existingSlugs = allProjects.map(p => p.slug);
      
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      updates.slug = uniqueSlug;
    }
    
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
    return db.select().from(directories).where(eq(directories.projectId, projectId)).orderBy(directories.sortOrder);
  }

  async getDirectory(id: number): Promise<Directory | undefined> {
    const [directory] = await db.select().from(directories).where(eq(directories.id, id));
    return directory;
  }

  async getDirectoryBySlug(projectId: number, slug: string): Promise<Directory | undefined> {
    const [directory] = await db
      .select()
      .from(directories)
      .where(and(eq(directories.projectId, projectId), eq(directories.slug, slug)));
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

  async updateDirectoryOrder(directoryId: number, newSortOrder: number): Promise<boolean> {
    const result = await db
      .update(directories)
      .set({ sortOrder: newSortOrder })
      .where(eq(directories.id, directoryId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Images
  async getImagesByDirectory(directoryId: number): Promise<Image[]> {
    // Omit imageData from list queries for performance (large binary field)
    return db.select({
      id: images.id,
      directoryId: images.directoryId,
      filename: images.filename,
      originalFilename: images.originalFilename,
      slug: images.slug,
      filePath: images.filePath,
      fileSize: images.fileSize,
      format: images.format,
      width: images.width,
      height: images.height,
      sourceType: images.sourceType,
      sourceUrl: images.sourceUrl,
      imageData: sql<null>`NULL`.as('imageData'),
      uploadedAt: images.uploadedAt,
    }).from(images).where(eq(images.directoryId, directoryId));
  }

  async getImage(id: number): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async getImageBySlug(directoryId: number, slug: string): Promise<Image | undefined> {
    const [image] = await db
      .select()
      .from(images)
      .where(and(eq(images.directoryId, directoryId), eq(images.slug, slug)));
    return image;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async updateImage(id: number, updates: Partial<InsertImage>): Promise<Image | undefined> {
    const [updated] = await db
      .update(images)
      .set(updates)
      .where(eq(images.id, id))
      .returning();
    return updated;
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
    // Get current settings to determine fuzzy search threshold
    const appSettings = await this.getSettings();
    
    // Map fuzzy search variations to word_similarity thresholds
    // 1 char variation: stricter threshold (0.6) - very similar words only
    // 2 char variation: moderate threshold (0.3) - allows more variations
    // 3 char variation: looser threshold (0.2) - allows most variations
    const thresholdMap: Record<number, number> = {
      1: 0.6,
      2: 0.3,
      3: 0.2,
    };
    const threshold = thresholdMap[appSettings.fuzzySearchVariations] || 0.3;
    
    // Omit imageData from search results for performance
    const results = await db
      .select({
        image: {
          id: images.id,
          directoryId: images.directoryId,
          filename: images.filename,
          originalFilename: images.originalFilename,
          filePath: images.filePath,
          fileSize: images.fileSize,
          format: images.format,
          width: images.width,
          height: images.height,
          sourceType: images.sourceType,
          sourceUrl: images.sourceUrl,
          imageData: sql<null>`NULL`.as('imageData'),
          uploadedAt: images.uploadedAt,
        },
        ocrResult: ocrResults,
      })
      .from(ocrResults)
      .innerJoin(images, eq(images.id, ocrResults.imageId))
      .where(
        or(
          // Exact substring match (case-insensitive)
          ilike(ocrResults.consensusText, `%${query}%`),
          // Fuzzy match using word_similarity with dynamic threshold
          sql`word_similarity(${query}, ${ocrResults.consensusText}) > ${threshold}`
        )
      )
      .orderBy(
        // Order by: exact match first, then word similarity, then confidence
        desc(sql`CASE WHEN ${ocrResults.consensusText} ILIKE ${`%${query}%`} THEN 1 ELSE 0 END`),
        desc(sql`word_similarity(${query}, ${ocrResults.consensusText})`),
        desc(
          sql`CASE 
            WHEN ${ocrResults.consensusSource} = 'pytesseract_config1' THEN ${ocrResults.pytesseractConfidence}
            WHEN ${ocrResults.consensusSource} = 'pytesseract_config2' THEN ${ocrResults.easyocrConfidence}
            ELSE 0
          END`
        )
      );
    
    return results;
  }

  // Monitored Searches
  async getMonitoredSearches(): Promise<Array<MonitoredSearch & { resultCount: number }>> {
    const searches = await db.select().from(monitoredSearches).orderBy(desc(monitoredSearches.createdAt));
    
    // Get current settings to determine fuzzy search threshold
    const appSettings = await this.getSettings();
    const thresholdMap: Record<number, number> = {
      1: 0.6,
      2: 0.3,
      3: 0.2,
    };
    const threshold = thresholdMap[appSettings.fuzzySearchVariations] || 0.3;
    
    // For each search, count the number of results using fuzzy matching
    const searchesWithCounts = await Promise.all(
      searches.map(async (search) => {
        const count = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(ocrResults)
          .where(
            or(
              // Exact substring match (case-insensitive)
              ilike(ocrResults.consensusText, `%${search.searchTerm}%`),
              // Fuzzy match using word_similarity with dynamic threshold
              sql`word_similarity(${search.searchTerm}, ${ocrResults.consensusText}) > ${threshold}`
            )
          );
        
        return {
          ...search,
          resultCount: count[0]?.count || 0,
        };
      })
    );
    
    return searchesWithCounts;
  }

  async createMonitoredSearch(search: InsertMonitoredSearch): Promise<MonitoredSearch> {
    const [newSearch] = await db.insert(monitoredSearches).values(search).returning();
    return newSearch;
  }

  async deleteMonitoredSearch(id: number): Promise<boolean> {
    const result = await db.delete(monitoredSearches).where(eq(monitoredSearches.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Settings
  async getSettings(): Promise<Settings> {
    let [appSettings] = await db.select().from(settings).limit(1);
    
    // Create default settings if none exist
    if (!appSettings) {
      [appSettings] = await db.insert(settings).values({
        fuzzySearchVariations: 2,
      }).returning();
    }
    
    return appSettings;
  }

  async updateSettings(updates: UpdateSettings): Promise<Settings> {
    const currentSettings = await this.getSettings();
    
    const [updated] = await db
      .update(settings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settings.id, currentSettings.id))
      .returning();
    
    return updated;
  }

  // Statistics
  async getProjectStats(projectId: number): Promise<{
    totalImages: number;
    processedImages: number;
    totalDirectories: number;
  }> {
    // Use CTE to batch queries for better performance
    const result = await db.execute(sql`
      WITH directory_ids AS (
        SELECT id FROM ${directories} WHERE ${directories.projectId} = ${projectId}
      ),
      image_stats AS (
        SELECT count(*)::int as total
        FROM ${images}
        WHERE ${images.directoryId} IN (SELECT id FROM directory_ids)
      ),
      processed_stats AS (
        SELECT count(DISTINCT ${images.id})::int as processed
        FROM ${ocrResults}
        INNER JOIN ${images} ON ${images.id} = ${ocrResults.imageId}
        WHERE ${images.directoryId} IN (SELECT id FROM directory_ids)
      )
      SELECT 
        (SELECT count(*)::int FROM directory_ids) as total_directories,
        COALESCE((SELECT total FROM image_stats), 0) as total_images,
        COALESCE((SELECT processed FROM processed_stats), 0) as processed_images
    `);

    const stats = result.rows[0] as any;
    return {
      totalImages: stats?.total_images || 0,
      processedImages: stats?.processed_images || 0,
      totalDirectories: stats?.total_directories || 0,
    };
  }
}

export const storage = new DbStorage();
