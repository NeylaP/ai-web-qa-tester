import * as path from 'node:path';
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { AngularComponent, AngularService, HttpCall } from '@ai-web-qa-tester/core-domain';
import type { AngularInventory, InventoryAnalyzerPort } from '@ai-web-qa-tester/core-application';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function toRelative(filePath: string, root: string): string {
  return path.relative(root, filePath).split(path.sep).join('/');
}

export class TsMorphAngularAnalyzer implements InventoryAnalyzerPort<AngularInventory> {
  async analyze(absolutePath: string, _tsConfigPath: string): Promise<AngularInventory> {
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

    const components: AngularComponent[] = [];
    const services: AngularService[] = [];
    const routes: string[] = [];

    for (const sf of project.getSourceFiles()) {
      const relPath = toRelative(sf.getFilePath(), absolutePath);

      for (const cls of sf.getClasses()) {
        const componentDec = cls.getDecorator('Component');
        if (componentDec) {
          let selector = '';
          const args = componentDec.getArguments();
          if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
            const prop = args[0].getProperty('selector');
            if (prop && Node.isPropertyAssignment(prop)) {
              const init = prop.getInitializer();
              if (init && Node.isStringLiteral(init)) {
                selector = init.getLiteralValue();
              }
            }
          }
          components.push({ name: cls.getName() ?? 'Unknown', selector, filePath: relPath });
        }

        const injectableDec = cls.getDecorator('Injectable');
        if (injectableDec) {
          const httpCalls: HttpCall[] = [];
          for (const callExpr of cls.getDescendantsOfKind(SyntaxKind.CallExpression)) {
            const expr = callExpr.getExpression();
            if (!Node.isPropertyAccessExpression(expr)) continue;
            const methodName = expr.getName().toUpperCase();
            if (!HTTP_METHODS.includes(methodName as HttpMethod)) continue;
            const receiver = expr.getExpression();
            if (!Node.isPropertyAccessExpression(receiver)) continue;
            if (receiver.getName() !== 'http') continue;
            const callArgs = callExpr.getArguments();
            if (callArgs.length > 0 && Node.isStringLiteral(callArgs[0])) {
              httpCalls.push({ method: methodName as HttpMethod, urlPattern: callArgs[0].getLiteralValue() });
            }
          }
          services.push({ name: cls.getName() ?? 'Unknown', filePath: relPath, httpCalls });
        }
      }

      for (const propAssign of sf.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
        if (propAssign.getName() === 'path') {
          const init = propAssign.getInitializer();
          if (init && Node.isStringLiteral(init)) {
            const val = init.getLiteralValue();
            if (!routes.includes(val)) routes.push(val);
          }
        }
      }
    }

    return { components, services, routes };
  }
}
