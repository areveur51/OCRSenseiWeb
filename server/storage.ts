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
  getAllProjects(limit?: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  convertProjectToDirectory(projectId: number, targetProjectId: number, newParentDirId?: number): Promise<Directory>;
  convertDirectoryToProject(directoryId: number): Promise<Project>;

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
  deleteOcrResultsByImage(imageId: number): Promise<boolean>;
  upsertOcrResult(result: InsertOcrResult): Promise<OcrResult>;

  // Processing Queue
  getQueuedItems(): Promise<ProcessingQueue[]>;
  getQueueItem(id: number): Promise<ProcessingQueue | undefined>;
  getQueueItemByImage(imageId: number): Promise<ProcessingQueue | undefined>;
  createQueueItem(item: InsertProcessingQueue): Promise<ProcessingQueue>;
  updateQueueItem(id: number, updates: Partial<ProcessingQueue>): Promise<ProcessingQueue | undefined>;

  // Search
  searchText(query: string, options?: { offset?: number; limit?: number }): Promise<{ results: Array<{ image: Image; ocrResult: OcrResult; projectSlug: string; directorySlug: string; imageSlug: string }>; total: number }>;

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
  async getAllProjects(limit?: number): Promise<Project[]> {
    // Order by updatedAt to show most recently updated projects first
    let query = db.select().from(projects).orderBy(desc(projects.updatedAt));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    return query;
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

  async convertProjectToDirectory(projectId: number, targetProjectId: number, newParentDirId?: number): Promise<Directory> {
    // Prevent converting a project into itself
    if (projectId === targetProjectId) {
      throw new Error("Cannot convert a project into itself");
    }

    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const targetProject = await this.getProject(targetProjectId);
    if (!targetProject) {
      throw new Error("Target project not found");
    }

    // Validate parent directory if specified
    if (newParentDirId) {
      const parentDir = await this.getDirectory(newParentDirId);
      if (!parentDir || parentDir.projectId !== targetProjectId) {
        throw new Error("Invalid parent directory or parent belongs to different project");
      }
    }

    // Get all directories in the project being converted
    const oldDirs = await this.getDirectoriesByProject(projectId);

    // Create a new directory in the target project to represent the old project
    const { generateSlug } = await import("@shared/slugs");
    const baseSlug = generateSlug(project.name);
    const targetDirs = await this.getDirectoriesByProject(targetProjectId);
    const existingSlugs = targetDirs.map(d => d.slug);
    const { generateUniqueSlug } = await import("@shared/slugs");
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

    const parentDir = newParentDirId ? await this.getDirectory(newParentDirId) : null;
    const newPath = parentDir 
      ? `${parentDir.path}/${project.name}`
      : `/${project.name}`;

    const [newDir] = await db.insert(directories).values({
      projectId: targetProjectId,
      name: project.name,
      slug: uniqueSlug,
      path: newPath,
      parentId: newParentDirId || null,
      sortOrder: 0,
    }).returning();

    // Recursively update all directories to belong to target project and fix paths
    const updateDirectoryTree = async (oldParentId: number | null, newParentId: number, basePath: string) => {
      const children = oldDirs.filter(d => d.parentId === oldParentId);
      
      for (const child of children) {
        const childPath = `${basePath}/${child.name}`;
        
        await db
          .update(directories)
          .set({ 
            projectId: targetProjectId,
            parentId: newParentId,
            path: childPath
          })
          .where(eq(directories.id, child.id));

        // Recursively update children of this directory
        await updateDirectoryTree(child.id, child.id, childPath);
      }
    };

    // Start the recursive update from root directories (parentId: null)
    await updateDirectoryTree(null, newDir.id, newPath);

    // Update all images to belong to the target project's directories (paths already updated)
    await db
      .update(images)
      .set({ directoryId: db.raw(`directory_id`) }) // No-op to trigger any cascading updates if needed
      .where(sql`directory_id IN (SELECT id FROM directories WHERE project_id = ${targetProjectId})`);

    // Delete the old project
    await this.deleteProject(projectId);

    return newDir;
  }

  async convertDirectoryToProject(directoryId: number): Promise<Project> {
    const directory = await this.getDirectory(directoryId);
    if (!directory) {
      throw new Error("Directory not found");
    }

    const oldProjectId = directory.projectId;

    // Generate unique slug for new project
    const { generateSlug } = await import("@shared/slugs");
    const baseSlug = generateSlug(directory.name);
    const allProjects = await this.getAllProjects();
    const existingSlugs = allProjects.map(p => p.slug);
    const { generateUniqueSlug } = await import("@shared/slugs");
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

    // Create new project
    const [newProject] = await db.insert(projects).values({
      name: directory.name,
      slug: uniqueSlug,
      description: null,
    }).returning();

    // Get ALL directories in the old project to find the full subtree
    const allOldDirs = await db
      .select()
      .from(directories)
      .where(eq(directories.projectId, oldProjectId));

    // Find all descendants of this directory (recursively)
    const findDescendants = (parentId: number): number[] => {
      const children = allOldDirs.filter(d => d.parentId === parentId);
      const childIds = children.map(c => c.id);
      const allDescendants = [...childIds];
      
      for (const childId of childIds) {
        allDescendants.push(...findDescendants(childId));
      }
      
      return allDescendants;
    };

    const descendantIds = findDescendants(directoryId);
    const allAffectedDirIds = [directoryId, ...descendantIds];

    // Recursively update directory tree paths relative to new project root
    const updateDescendants = async (oldDirId: number, newParentId: number | null, basePath: string) => {
      const dir = allOldDirs.find(d => d.id === oldDirId);
      if (!dir) return;

      const newPath = basePath;
      
      await db
        .update(directories)
        .set({
          projectId: newProject.id,
          parentId: newParentId,
          path: newPath
        })
        .where(eq(directories.id, oldDirId));

      // Update children
      const children = allOldDirs.filter(d => d.parentId === oldDirId);
      for (const child of children) {
        await updateDescendants(child.id, oldDirId, `${newPath}/${child.name}`);
      }
    };

    // Start the update - the original directory becomes the root
    await updateDescendants(directoryId, null, `/${directory.name}`);

    return newProject;
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

  async changeDirectoryParent(directoryId: number, newParentId: number | null, newPath: string): Promise<Directory | undefined> {
    const [updated] = await db
      .update(directories)
      .set({ parentId: newParentId, path: newPath })
      .where(eq(directories.id, directoryId))
      .returning();
    return updated;
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
    const [result] = await db
      .select()
      .from(ocrResults)
      .where(eq(ocrResults.imageId, imageId))
      .orderBy(desc(ocrResults.processedAt))
      .limit(1);
    return result;
  }

  async createOcrResult(result: InsertOcrResult): Promise<OcrResult> {
    const [newResult] = await db.insert(ocrResults).values(result).returning();
    return newResult;
  }

  async deleteOcrResultsByImage(imageId: number): Promise<boolean> {
    const result = await db.delete(ocrResults).where(eq(ocrResults.imageId, imageId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async upsertOcrResult(result: InsertOcrResult): Promise<OcrResult> {
    // Check if an OCR result already exists for this image
    const existing = await this.getOcrResultByImage(result.imageId);
    
    if (existing) {
      // Update the existing result
      const [updated] = await db
        .update(ocrResults)
        .set({
          pytesseractText: result.pytesseractText,
          pytesseractConfidence: result.pytesseractConfidence,
          easyocrText: result.easyocrText,
          easyocrConfidence: result.easyocrConfidence,
          consensusText: result.consensusText,
          consensusSource: result.consensusSource,
          boundingBoxes: result.boundingBoxes,
          processedAt: new Date(),
        })
        .where(eq(ocrResults.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert a new result
      return this.createOcrResult(result);
    }
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
  async searchText(query: string, options?: { offset?: number; limit?: number }): Promise<{ 
    results: Array<{ 
      image: Image; 
      ocrResult: OcrResult;
      projectSlug: string;
      directorySlug: string;
      imageSlug: string;
    }>;
    total: number;
  }> {
    // Get current settings to determine fuzzy search threshold
    const appSettings = await this.getSettings();
    
    // Map fuzzy search variations to word_similarity thresholds
    const thresholdMap: Record<number, number> = {
      1: 0.6,
      2: 0.3,
      3: 0.2,
    };
    const threshold = thresholdMap[appSettings.fuzzySearchVariations] || 0.3;
    
    const whereClause = or(
      ilike(ocrResults.consensusText, `%${query}%`),
      sql`word_similarity(${query}, ${ocrResults.consensusText}) > ${threshold}`
    );
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ocrResults)
      .innerJoin(images, eq(images.id, ocrResults.imageId))
      .innerJoin(directories, eq(directories.id, images.directoryId))
      .innerJoin(projects, eq(projects.id, directories.projectId))
      .where(whereClause);
    
    const total = countResult?.count || 0;
    
    // Get paginated results
    let resultsQuery = db
      .select({
        image: {
          id: images.id,
          slug: images.slug,
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
        ocrResult: {
          id: ocrResults.id,
          imageId: ocrResults.imageId,
          pytesseractText: ocrResults.pytesseractText,
          pytesseractConfidence: ocrResults.pytesseractConfidence,
          easyocrText: ocrResults.easyocrText,
          easyocrConfidence: ocrResults.easyocrConfidence,
          consensusText: ocrResults.consensusText,
          consensusSource: ocrResults.consensusSource,
          boundingBoxes: ocrResults.boundingBoxes,
          processedAt: ocrResults.processedAt,
        },
        projectSlug: projects.slug,
        directorySlug: directories.slug,
        imageSlug: images.slug,
      })
      .from(ocrResults)
      .innerJoin(images, eq(images.id, ocrResults.imageId))
      .innerJoin(directories, eq(directories.id, images.directoryId))
      .innerJoin(projects, eq(projects.id, directories.projectId))
      .where(whereClause)
      .orderBy(
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
    
    if (options?.limit) {
      resultsQuery = resultsQuery.limit(options.limit) as any;
    }
    
    if (options?.offset) {
      resultsQuery = resultsQuery.offset(options.offset) as any;
    }
    
    const results = await resultsQuery;
    
    return { results, total };
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
