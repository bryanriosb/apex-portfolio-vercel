import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_URL_API || '',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_ID || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

export const S3AttachmentsService = {
  async getPresignedUrls(paths: string[]): Promise<Record<string, string>> {
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return {};
    }

    const bucketName = 'apex-artifacts';
    const result: Record<string, string> = {};

    for (const path of paths) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: path,
        });

        // 1 hora de validez (3600 segundos)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        result[path] = signedUrl;
      } catch (error) {
        console.error(`Error generating presigned URL for ${path}:`, error);
      }
    }

    return result;
  }
};
