import * as fs from 'node:fs';
import { FileSystemPort } from '@ai-web-qa-tester/core-application';

export class NodeFileSystemAdapter implements FileSystemPort {
  exists(p: string): boolean {
    return fs.existsSync(p);
  }

  isDirectory(p: string): boolean {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }
}
