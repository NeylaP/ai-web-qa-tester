import * as path from 'node:path';
import { Project, Node, SyntaxKind, type SourceFile, type ClassDeclaration } from 'ts-morph';
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

    const constantMap = this.buildConstantMap(project.getSourceFiles());

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
          const httpCalls = this.extractHttpCalls(cls, constantMap);
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

  private extractHttpCalls(cls: ClassDeclaration, constantMap: Map<string, string>): HttpCall[] {
    const httpProp = this.getHttpPropertyName(cls);
    if (!httpProp) return [];

    const httpCalls: HttpCall[] = [];

    for (const callExpr of cls.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = callExpr.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) continue;

      const methodName = expr.getName().toUpperCase();
      if (!HTTP_METHODS.includes(methodName as HttpMethod)) continue;

      const receiver = expr.getExpression();
      if (!Node.isPropertyAccessExpression(receiver)) continue;
      if (receiver.getName() !== httpProp) continue;

      const callArgs = callExpr.getArguments();
      if (callArgs.length === 0) continue;

      const urlPattern = this.extractUrl(callArgs[0], constantMap);
      if (urlPattern) {
        httpCalls.push({ method: methodName as HttpMethod, urlPattern });
      }
    }

    return httpCalls;
  }

  private getHttpPropertyName(cls: ClassDeclaration): string | null {
    // Constructor injection: constructor(private http: HttpClient)
    for (const ctor of cls.getConstructors()) {
      for (const param of ctor.getParameters()) {
        const typeNode = param.getTypeNode();
        if (typeNode && typeNode.getText().replace(/\s/g, '') === 'HttpClient') {
          return param.getName();
        }
      }
    }

    // inject() function injection: private http = inject(HttpClient)
    for (const prop of cls.getProperties()) {
      const init = prop.getInitializer();
      if (!init || !Node.isCallExpression(init)) continue;
      const callee = init.getExpression();
      if (!Node.isIdentifier(callee) || callee.getText() !== 'inject') continue;
      const args = init.getArguments();
      if (args.length > 0 && args[0].getText() === 'HttpClient') {
        return prop.getName().replace(/^[#_]/, '');
      }
    }

    return null;
  }

  private extractUrl(arg: Node, constantMap: Map<string, string>): string | null {
    if (Node.isStringLiteral(arg)) {
      return arg.getLiteralValue();
    }

    if (Node.isNoSubstitutionTemplateLiteral(arg)) {
      return arg.getLiteralText();
    }

    if (Node.isTemplateExpression(arg)) {
      let url = arg.getHead().getLiteralText();
      for (const span of arg.getTemplateSpans()) {
        const exprText = span.getExpression().getText().trim();
        const resolved = constantMap.get(exprText);
        url += resolved !== undefined ? resolved : ':param';
        url += span.getLiteral().getLiteralText();
      }
      return url || null;
    }

    return null;
  }

  private buildConstantMap(sourceFiles: SourceFile[]): Map<string, string> {
    const raw = new Map<string, string>();

    for (const sf of sourceFiles) {
      for (const stmt of sf.getVariableStatements()) {
        for (const decl of stmt.getDeclarations()) {
          const init = decl.getInitializer();
          if (!init) continue;
          const name = decl.getName();

          if (Node.isStringLiteral(init)) {
            raw.set(name, init.getLiteralValue());
            continue;
          }

          if (Node.isObjectLiteralExpression(init)) {
            for (const prop of init.getProperties()) {
              if (!Node.isPropertyAssignment(prop)) continue;
              const propName = prop.getName();
              const propInit = prop.getInitializer();
              if (!propInit) continue;
              const rawVal = this.rawTemplateValue(propInit);
              if (rawVal !== null) {
                raw.set(`${name}.${propName}`, rawVal);
              }
            }
          }
        }
      }
    }

    // Multi-pass resolution: substitute known constants into template placeholders
    const resolved = new Map<string, string>();
    for (const [k, v] of raw) {
      if (!v.includes('\x00')) resolved.set(k, v); // plain strings (no placeholders)
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const [k, v] of raw) {
        if (resolved.has(k)) continue;
        const result = v.replace(/\x00([^\x00]+)\x00/g, (_, expr: string) => {
          const r = resolved.get(expr.trim());
          return r !== undefined ? r : `\x00${expr}\x00`;
        });
        if (!result.includes('\x00')) {
          resolved.set(k, result);
          changed = true;
        }
      }
    }

    // Whatever remains unresolved: substitute with partial value (strip remaining placeholders)
    for (const [k, v] of raw) {
      if (resolved.has(k)) continue;
      const partial = v.replace(/\x00([^\x00]+)\x00/g, (_, expr: string) => {
        return resolved.get(expr.trim()) ?? '';
      });
      resolved.set(k, partial);
    }

    return resolved;
  }

  private rawTemplateValue(node: Node): string | null {
    if (Node.isStringLiteral(node)) return node.getLiteralValue();

    if (Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralText();

    if (Node.isTemplateExpression(node)) {
      // Encode expressions as NUL-delimited placeholders for later resolution
      let result = node.getHead().getLiteralText();
      for (const span of node.getTemplateSpans()) {
        result += `\x00${span.getExpression().getText().trim()}\x00`;
        result += span.getLiteral().getLiteralText();
      }
      return result;
    }

    return null;
  }
}
