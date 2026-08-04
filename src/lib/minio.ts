import { Client } from 'minio';

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = Number(process.env.MINIO_PORT || '9000');
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
const bucketName = process.env.MINIO_BUCKET || 'pdf-tools';

export const minioClient = new Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

export const getBucket = () => bucketName;

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
  }
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  size: number,
  mimeType: string,
  metadata?: Record<string, string>
) {
  await ensureBucket();
  await minioClient.putObject(bucketName, objectName, buffer, size, {
    'Content-Type': mimeType,
    ...metadata,
  });
  return objectName;
}

export async function downloadFile(objectName: string) {
  const stream = minioClient.getObject(bucketName, objectName);
  return stream;
}

export async function getFileStat(objectName: string) {
  return minioClient.statObject(bucketName, objectName);
}

export async function deleteFile(objectName: string) {
  await minioClient.removeObject(bucketName, objectName);
}

export function getPresignedUrl(objectName: string, expiresInSeconds = 3600) {
  return minioClient.presignedGetObject(bucketName, objectName, expiresInSeconds);
}
