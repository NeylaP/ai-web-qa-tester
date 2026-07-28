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

  readFile(p: string): string {
    return fs.readFileSync(p, 'utf-8');
  }

  writeFile(p: string, content: string): void {
    fs.writeFileSync(p, content, 'utf-8');
  }

  listFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  }

  mkdir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
  }
}
