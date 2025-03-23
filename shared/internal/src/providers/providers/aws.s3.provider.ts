import { Readable } from 'stream';
import { ApiKeyProvider } from '../provider.interface';
import { S3 } from 'aws-sdk';

export class AwsS3Provider implements ApiKeyProvider {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
  s3: S3;

  constructor(config: Record<string, string>) {
    this.region = config['region'];
    this.accessKeyId = config['accessKeyId'];
    this.secretAccessKey = config['secretAccessKey'];
    this.endpoint = config['endpoint'];
    this.bucket = config['bucket'];
    this.s3 = this.createS3Client();
  }

  createS3Client() {
    return new S3({
      region: this.region,
      apiVersion: 'latest',
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      endpoint: this.endpoint,
    });
  }

  async uploadFile(_: string, file: Express.Multer.File): Promise<string> {
    const client = this.s3;
    return new Promise((resolve, reject) => {
      client.putObject(
        {
          Bucket: this.bucket,
          Key: `${file.originalname}`,
          Body: file.buffer,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(file.originalname);
          }
        }
      );
    });
  }

  async downloadFile(fileId: string): Promise<Readable> {
    const client = this.s3;
    return new Promise((resolve, reject) => {
      client.getObject(
        {
          Bucket: this.bucket,
          Key: fileId,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Body as Readable);
          }
        }
      );
    });
  }

  deleteFile(path: string): Promise<boolean> {
    const client = this.s3;

    return new Promise((resolve, reject) => {
      client.deleteObject(
        {
          Bucket: this.bucket,
          Key: path,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async validateCredentials() {
    return true;
  }

  async getUserInfo() {
    return {
      id: this.accessKeyId,
      name: this.bucket,
      email: this.bucket,
    };
  }

  async getFileMetadata(fileId: string) {
    const client = this.s3;
    return new Promise((resolve, reject) => {
      client.headObject(
        {
          Bucket: this.bucket,
          Key: fileId,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      );
    });
  }
}
