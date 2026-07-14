import * as path from 'node:path';
import { Project, Node, type Node as MorphNode } from 'ts-morph';
import type { NestController, NestDto, NestEndpoint, NestService } from '@ai-web-qa-tester/core-domain';
import type { InventoryAnalyzerPort, NestInventory } from '@ai-web-qa-tester/core-application';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const ENDPOINT_DECORATORS: Record<string, HttpMethod> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
};

function toRelative(filePath: string, root: string): string {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function firstStringArg(args: MorphNode[]): string {
  if (args.length === 0) return '';
  const arg = args[0];
  if (Node.isStringLiteral(arg)) return arg.getLiteralValue();
  return '';
}

export class TsMorphNestAnalyzer implements InventoryAnalyzerPort<NestInventory> {
  async analyze(absolutePath: string, _tsConfigPath: string): Promise<NestInventory> {
    const project = new Project({
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipLibCheck: true,
        noResolve: true,
        strict: false,
      },
      skipAddingFilesFromTsConfig: true,
    });

    const glob = path.join(absolutePath, 'src', '**', '*.ts').split(path.sep).join('/');
    project.addSourceFilesAtPaths(glob);

    const controllers: NestController[] = [];
    const services: NestService[] = [];
    const dtos: NestDto[] = [];

    for (const sf of project.getSourceFiles()) {
      const relPath = toRelative(sf.getFilePath(), absolutePath);
      const isDto = relPath.endsWith('.dto.ts');

      for (const cls of sf.getClasses()) {
        const controllerDec = cls.getDecorator('Controller');
        if (controllerDec) {
          const basePath = firstStringArg(controllerDec.getArguments());
          const endpoints: NestEndpoint[] = [];

          for (const method of cls.getMethods()) {
            for (const [decName, httpMethod] of Object.entries(ENDPOINT_DECORATORS)) {
              const methodDec = method.getDecorator(decName);
              if (methodDec) {
                const methodPath = firstStringArg(methodDec.getArguments());
                const combined = [basePath, methodPath].filter(Boolean).join('/');
                endpoints.push({ method: httpMethod, path: combined });
                break;
              }
            }
          }

          controllers.push({
            name: cls.getName() ?? 'Unknown',
            basePath,
            filePath: relPath,
            endpoints,
          });
        }

        if (cls.getDecorator('Injectable')) {
          services.push({ name: cls.getName() ?? 'Unknown', filePath: relPath });
        }

        if (isDto) {
          const fields = cls.getProperties()
            .filter((p) => !p.isStatic())
            .map((p) => p.getName());
          dtos.push({ name: cls.getName() ?? 'Unknown', filePath: relPath, fields });
        }
      }
    }

    return { controllers, services, dtos };
  }
}
