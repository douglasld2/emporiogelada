import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

function getGCSConfig() {
  const fullBucketName = process.env.GCS_BUCKET_NAME;
  if (!fullBucketName) {
    throw new Error("GCS_BUCKET_NAME not set. Please set the bucket name.");
  }

  // Handle subfolders in bucket name (e.g., "my-bucket/client-a")
  const parts = fullBucketName.split('/');
  const bucketName = parts[0];
  const rootFolder = parts.slice(1).join('/');

  let serviceAccountKey = process.env.GCS_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GCS_SERVICE_ACCOUNT_KEY not set. Please set the service account JSON key.");
  }

  serviceAccountKey = serviceAccountKey.trim();
  if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) {
    serviceAccountKey = serviceAccountKey.slice(1, -1);
  }
  if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"') && !serviceAccountKey.startsWith('{"')) {
    serviceAccountKey = serviceAccountKey.slice(1, -1);
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (e1) {
    try {
      const cleaned = serviceAccountKey
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "")
        .replace(/\t/g, "");
      credentials = JSON.parse(cleaned);
    } catch (e2) {
      try {
        const singleLine = serviceAccountKey.replace(/\s+/g, " ");
        credentials = JSON.parse(singleLine);
      } catch (e3) {
        console.error("Failed to parse GCS_SERVICE_ACCOUNT_KEY. Length:", serviceAccountKey.length);
        throw new Error("GCS_SERVICE_ACCOUNT_KEY is not valid JSON. Make sure you paste the full content of the service account JSON file.");
      }
    }
  }

  return { bucketName, rootFolder, credentials };
}

let _storageClient: Storage | null = null;
let _bucketName: string | null = null;
let _rootFolder: string | null = null;

function getStorageClient(): Storage {
  if (!_storageClient) {
    const config = getGCSConfig();
    _bucketName = config.bucketName;
    _rootFolder = config.rootFolder;
    _storageClient = new Storage({
      credentials: config.credentials as any,
      projectId: (config.credentials as any).project_id || "",
    });
  }
  return _storageClient;
}

function getBucketName(): string {
  if (!_bucketName) {
    const config = getGCSConfig();
    _bucketName = config.bucketName;
  }
  return _bucketName;
}

function getRootFolder(): string {
  if (_rootFolder === null) {
    const config = getGCSConfig();
    _rootFolder = config.rootFolder;
  }
  return _rootFolder;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

const UPLOAD_PREFIX = "uploads";

export class ObjectStorageService {
  constructor() {}

  private getStorage(): Storage {
    return getStorageClient();
  }

  private getBucket() {
    return this.getStorage().bucket(getBucketName());
  }

  private getFullObjectName(name: string): string {
    const root = getRootFolder();
    return root ? `${root}/${name}` : name;
  }

  async getUploadURL(contentType?: string): Promise<{ uploadURL: string; objectPath: string }> {
    const objectId = randomUUID();
    const relativePath = `${UPLOAD_PREFIX}/${objectId}`;
    const fullObjectName = this.getFullObjectName(relativePath);
    const bucket = this.getBucket();
    const file = bucket.file(fullObjectName);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: contentType || "application/octet-stream",
    });

    return {
      uploadURL: signedUrl,
      objectPath: `/objects/${relativePath}`,
    };
  }

  async getObjectFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const relativePath = objectPath.replace("/objects/", "");
    if (!relativePath) {
      throw new ObjectNotFoundError();
    }

    const fullObjectName = this.getFullObjectName(relativePath);
    const bucket = this.getBucket();
    const file = bucket.file(fullObjectName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return file;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": String(metadata.size || ""),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async deleteObject(objectPath: string): Promise<void> {
    const file = await this.getObjectFile(objectPath);
    await file.delete();
  }
}
