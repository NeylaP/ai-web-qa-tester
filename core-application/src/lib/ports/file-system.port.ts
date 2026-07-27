export interface FileSystemPort {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readFile?(path: string): string;
}
