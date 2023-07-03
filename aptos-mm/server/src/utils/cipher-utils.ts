import * as crypto from 'crypto';
import { appConfiguration } from 'src/config';

const IV_LENGTH = 16;
export function encrypt(text) {
  const appConfig = appConfiguration();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(appConfig.aesSecretKey, 'hex'),
    iv,
  );

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text) {
  const appConfig = appConfiguration();
  const [iv, encryptedText] = text
    .split(':')
    .map((part) => Buffer.from(part, 'hex'));
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(appConfig.aesSecretKey, 'hex'),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
