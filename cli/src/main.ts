import { Command } from 'commander';
import {
  ScanProjectUseCase, ScanError,
  AnalyzeProjectUseCase, AnalysisError,
  BuildRouteMapUseCase, RouteMapError,
  GenerateTestsUseCase, GenerateTestsError,
  RunTestsUseCase, RunTestsError,
} from '@ai-web-qa-tester/core-application';
import {
  NodeFileSystemAdapter,
  PackageJsonDetector,
  DotQaManifestWriter,
  TsMorphAngularAnalyzer,
  TsMorphNestAnalyzer,
  ComponentInventoryWriter,
  ComponentInventoryReader,
  RouteMapWriter,
  RouteMapReader,
  NodeProcessManager,
} from '@ai-web-qa-tester/scanner';
import { PlaywrightSpecWriter, PlaywrightTestRunner } from '@ai-web-qa-tester/playwright-adapter';
import { AnthropicProvider, OpenAiProvider, AiEnricher } from '@ai-web-qa-tester/ai-orchestrator';

const program = new Command();

program
  .name('qa-tester')
  .description('AI Web QA Tester CLI')
  .version('0.0.1');

program
  .command('scan')
  .description('Scan an Angular + NestJS project and generate a manifest')
  .requiredOption('--frontend <path>', 'absolute or relative path to Angular frontend project')
  .requiredOption('--backend <path>', 'absolute or relative path to NestJS backend project')
  .action(async (opts: { frontend: string; backend: string }) => {
    const useCase = new ScanProjectUseCase(
      new NodeFileSystemAdapter(),
      new PackageJsonDetector(),
      new DotQaManifestWriter(),
    );

    try {
      const manifest = await useCase.execute({
        frontendPath: opts.frontend,
        backendPath: opts.backend,
      });
      console.log(`Manifest written to: ${opts.backend}/.qa/project-manifest.json`);
      console.log(JSON.stringify(manifest, null, 2));
    } catch (err) {
      if (err instanceof ScanError) {
        console.error(`Scan failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze Angular + NestJS source code and generate a component inventory')
  .requiredOption('--frontend <path>', 'absolute or relative path to Angular frontend project')
  .requiredOption('--backend <path>', 'absolute or relative path to NestJS backend project')
  .action(async (opts: { frontend: string; backend: string }) => {
    const useCase = new AnalyzeProjectUseCase(
      new NodeFileSystemAdapter(),
      new TsMorphAngularAnalyzer(),
      new TsMorphNestAnalyzer(),
      new ComponentInventoryWriter(),
    );

    try {
      const inventory = await useCase.execute({
        frontendPath: opts.frontend,
        backendPath: opts.backend,
      });
      console.log(`Inventory written to: ${opts.backend}/.qa/component-inventory.json`);
      console.log(JSON.stringify(inventory, null, 2));
    } catch (err) {
      if (err instanceof AnalysisError) {
        console.error(`Analysis failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program
  .command('map')
  .description('Build a route map connecting Angular HTTP calls to NestJS endpoints')
  .requiredOption('--backend <path>', 'absolute or relative path to NestJS backend project')
  .action(async (opts: { backend: string }) => {
    const useCase = new BuildRouteMapUseCase(
      new NodeFileSystemAdapter(),
      new ComponentInventoryReader(),
      new RouteMapWriter(),
    );

    try {
      const routeMap = await useCase.execute({ backendPath: opts.backend });
      console.log(`Route map written to: ${opts.backend}/.qa/route-map.json`);
      console.log(JSON.stringify(routeMap, null, 2));
    } catch (err) {
      if (err instanceof RouteMapError) {
        console.error(`Route map failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate Playwright test specs from a route map')
  .requiredOption('--backend <path>', 'absolute or relative path to NestJS backend project')
  .option('--output <path>', 'output directory for generated .spec.ts files (default: <backend>/.qa/tests)')
  .option('--enrich', 'enrich tests with AI-generated request bodies and assertions (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)')
  .action(async (opts: { backend: string; output?: string; enrich?: boolean }) => {
    let aiEnricher = null;
    if (opts.enrich) {
      const anthropicKey = process.env['ANTHROPIC_API_KEY'];
      const openaiKey = process.env['OPENAI_API_KEY'];
      if (anthropicKey) {
        aiEnricher = new AiEnricher(new AnthropicProvider(anthropicKey));
      } else if (openaiKey) {
        aiEnricher = new AiEnricher(new OpenAiProvider(openaiKey));
      } else {
        console.error('Generate failed: --enrich requires ANTHROPIC_API_KEY or OPENAI_API_KEY to be set');
        process.exit(1);
      }
    }

    const useCase = new GenerateTestsUseCase(
      new NodeFileSystemAdapter(),
      new RouteMapReader(),
      new PlaywrightSpecWriter(),
      aiEnricher,
    );

    try {
      const suite = await useCase.execute({
        backendPath: opts.backend,
        outputPath: opts.output,
      });
      const outputDir = opts.output ?? `${opts.backend}/.qa/tests`;
      console.log(`Test suite written to: ${opts.backend}/.qa/test-suite.json`);
      console.log(`Spec files written to: ${outputDir}`);
      console.log(JSON.stringify(suite, null, 2));
    } catch (err) {
      if (err instanceof GenerateTestsError) {
        console.error(`Generate failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Run generated Playwright tests against the backend')
  .requiredOption('--backend <path>', 'path to NestJS backend project')
  .requiredOption('--base-url <url>', 'base URL where the server will listen (e.g. http://localhost:3000)')
  .option('--start-command <cmd>', 'command to start the backend (default: npx nx serve <project>)')
  .action(async (opts: { backend: string; baseUrl: string; startCommand?: string }) => {
    const useCase = new RunTestsUseCase(
      new NodeFileSystemAdapter(),
      new PlaywrightTestRunner(),
      new NodeProcessManager(),
    );

    try {
      const report = await useCase.execute({
        backendPath: opts.backend,
        baseUrl: opts.baseUrl,
        startCommand: opts.startCommand,
      });
      console.log(`\nTest report written to: ${opts.backend}/.qa/test-report.json`);
      console.log(JSON.stringify(report, null, 2));
    } catch (err) {
      if (err instanceof RunTestsError) {
        console.error(`Run failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program.parse();
