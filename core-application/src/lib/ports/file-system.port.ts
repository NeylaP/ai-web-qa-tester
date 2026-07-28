export interface FileSystemPort {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readFile?(path: string): string;
  writeFile?(path: string, content: string): void;
  listFiles?(dir: string): string[];
  mkdir?(dir: string): void;
}
