#!/usr/bin/env node
import 'dotenv/config';
import * as path from 'node:path';
import { Command } from 'commander';
import {
  ScanProjectUseCase, ScanError,
  AnalyzeProjectUseCase, AnalysisError,
  BuildRouteMapUseCase, RouteMapError,
  GenerateTestsUseCase, GenerateTestsError,
  RunTestsUseCase, RunTestsError,
  ExportReportUseCase, ExportReportError,
} from '@ai-web-qa-tester/core-application';
import {
  NodeFileSystemAdapter,
  PackageJsonDetector,
  DotQaManifestWriter,
  TsMorphAngularAnalyzer,
  TsMorphNestAnalyzer,
  AngularConstantsScannerAdapter,
  NullNestAnalyzer,
  ComponentInventoryWriter,
  ComponentInventoryReader,
  RouteMapWriter,
  RouteMapReader,
  NodeProcessManager,
} from '@ai-web-qa-tester/scanner';
import { PlaywrightSpecWriter, PlaywrightTestRunner, HtmlReportGenerator } from '@ai-web-qa-tester/playwright-adapter';
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
  .option('--constants-file <path>', 'path to Angular constants file (skips ts-morph and NestJS analysis)')
  .action(async (opts: { frontend: string; backend: string; constantsFile?: string }) => {
    const angularAnalyzer = opts.constantsFile
      ? new AngularConstantsScannerAdapter(path.resolve(opts.constantsFile))
      : new TsMorphAngularAnalyzer();
    const nestAnalyzer = opts.constantsFile ? new NullNestAnalyzer() : new TsMorphNestAnalyzer();

    const useCase = new AnalyzeProjectUseCase(
      new NodeFileSystemAdapter(),
      angularAnalyzer,
      nestAnalyzer,
      new ComponentInventoryWriter(),
    );

    try {
      const inventory = await useCase.execute({
        frontendPath: opts.frontend,
        backendPath: opts.backend,
        skipBackendAnalysis: !!opts.constantsFile,
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
  .option('--skip-backend', 'skip starting the backend server (use when it is already running)')
  .option('--auth-token <token>', 'Bearer token injected as Authorization header in every request')
  .option('--origin-header <url>', 'value sent as origin_dev header (required for multi-tenant backends)')
  .action(async (opts: { backend: string; baseUrl: string; startCommand?: string; skipBackend?: boolean; authToken?: string; originHeader?: string }) => {
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
        skipBackend: opts.skipBackend,
        authToken: opts.authToken,
        originHeader: opts.originHeader,
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

program
  .command('report')
  .description('Generate an HTML report from a test-report.json')
  .requiredOption('--backend <path>', 'path to NestJS backend project')
  .option('--output <path>', 'output path for the HTML file (default: <backend>/.qa/test-report.html)')
  .action(async (opts: { backend: string; output?: string }) => {
    const useCase = new ExportReportUseCase(
      new NodeFileSystemAdapter(),
      new HtmlReportGenerator(),
    );

    try {
      const outputPath = useCase.execute({
        backendPath: opts.backend,
        outputPath: opts.output,
      });
      console.log(`HTML report written to: ${outputPath}`);
    } catch (err) {
      if (err instanceof ExportReportError) {
        console.error(`Report failed: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
      process.exit(1);
    }
  });

program
  .command('pipeline')
  .description('Run the full QA pipeline: [scan] → [analyze] → map → generate → run → report')
  .requiredOption('--backend <path>', 'path to NestJS backend project')
  .requiredOption('--base-url <url>', 'base URL where the server will listen')
  .option('--frontend <path>', 'path to Angular frontend project (enables scan + analyze steps)')
  .option('--enrich', 'enrich tests with AI (requires OPENAI_API_KEY or ANTHROPIC_API_KEY)')
  .option('--start-command <cmd>', 'command to start the backend')
  .option('--constants-file <path>', 'path to Angular constants file (skips ts-morph and NestJS analysis)')
  .option('--skip-backend', 'skip starting the backend server (use when it is already running)')
  .option('--auth-token <token>', 'Bearer token injected as Authorization header in every request')
  .option('--origin-header <url>', 'value sent as origin_dev header (required for multi-tenant backends)')
  .action(async (opts: {
    backend: string;
    baseUrl: string;
    frontend?: string;
    enrich?: boolean;
    startCommand?: string;
    constantsFile?: string;
    skipBackend?: boolean;
    authToken?: string;
    originHeader?: string;
  }) => {
    const fs = new NodeFileSystemAdapter();
    const step = (n: number, label: string) => process.stdout.write(`[${n}/6] ${label}...`);
    const ok = () => process.stdout.write(' done\n');

    try {
      if (opts.frontend) {
        if (opts.constantsFile) {
          console.log('[1/6] Scan     — skipped (constants mode, no package.json detection needed)');
        } else {
          step(1, 'Scanning project');
          await new ScanProjectUseCase(fs, new PackageJsonDetector(), new DotQaManifestWriter())
            .execute({ frontendPath: opts.frontend, backendPath: opts.backend });
          ok();
        }

        const angularAnalyzer = opts.constantsFile
          ? new AngularConstantsScannerAdapter(path.resolve(opts.constantsFile))
          : new TsMorphAngularAnalyzer();
        const nestAnalyzer = opts.constantsFile ? new NullNestAnalyzer() : new TsMorphNestAnalyzer();

        step(2, 'Analyzing source code');
        await new AnalyzeProjectUseCase(
          fs, angularAnalyzer, nestAnalyzer, new ComponentInventoryWriter(),
        ).execute({
          frontendPath: opts.frontend,
          backendPath: opts.backend,
          skipBackendAnalysis: !!opts.constantsFile,
        });
        ok();
      } else {
        console.log('[1/6] Scan     — skipped (no --frontend provided)');
        console.log('[2/6] Analyze  — skipped (no --frontend provided)');
      }

      const inventoryPath = path.resolve(opts.backend, '.qa', 'component-inventory.json');
      const testDir = path.resolve(opts.backend, '.qa', 'tests');

      let aiEnricher = null;
      if (opts.enrich) {
        const anthropicKey = process.env['ANTHROPIC_API_KEY'];
        const openaiKey = process.env['OPENAI_API_KEY'];
        if (anthropicKey) {
          aiEnricher = new AiEnricher(new AnthropicProvider(anthropicKey));
        } else if (openaiKey) {
          aiEnricher = new AiEnricher(new OpenAiProvider(openaiKey));
        } else {
          console.error('Pipeline failed: --enrich requires ANTHROPIC_API_KEY or OPENAI_API_KEY');
          process.exit(1);
        }
      }

      if (fs.exists(inventoryPath)) {
        step(3, 'Building route map');
        await new BuildRouteMapUseCase(fs, new ComponentInventoryReader(), new RouteMapWriter())
          .execute({ backendPath: opts.backend });
        ok();

        step(4, 'Generating test specs');
        await new GenerateTestsUseCase(fs, new RouteMapReader(), new PlaywrightSpecWriter(), aiEnricher)
          .execute({ backendPath: opts.backend });
        ok();
      } else if (fs.exists(testDir)) {
        console.log('[3/6] Map      — skipped (no inventory, using existing specs)');
        console.log('[4/6] Generate — skipped (no inventory, using existing specs)');
      } else {
        throw new Error(
          'No component-inventory.json and no test specs found.\n' +
          "Provide --frontend to analyze source code, or run 'generate' first.",
        );
      }

      step(5, 'Running tests');
      const report = await new RunTestsUseCase(fs, new PlaywrightTestRunner(), new NodeProcessManager())
        .execute({
          backendPath: opts.backend,
          baseUrl: opts.baseUrl,
          startCommand: opts.startCommand,
          skipBackend: opts.skipBackend,
          authToken: opts.authToken,
          originHeader: opts.originHeader,
        });
      ok();

      step(6, 'Generating HTML report');
      const htmlPath = new ExportReportUseCase(fs, new HtmlReportGenerator())
        .execute({ backendPath: opts.backend });
      ok();

      const { passed, failed, skipped, total } = report.summary;
      console.log(`\n${'─'.repeat(48)}`);
      console.log(`Pipeline complete`);
      console.log(`Tests: ${passed} passed  ${failed} failed  ${skipped} skipped  (${total} total)`);
      console.log(`Report: ${htmlPath}`);

      if (failed > 0) process.exit(1);
    } catch (err) {
      console.error(`\nPipeline failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
