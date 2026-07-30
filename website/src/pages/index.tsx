import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import clsx from 'clsx';

import styles from './index.module.css';

type Feature = {
  title: string;
  description: string;
  emoji: string;
};

const features: Feature[] = [
  {
    emoji: '🔍',
    title: 'Auto-discovery',
    description:
      'Detects Angular HTTP calls and NestJS controllers using ts-morph static analysis — including template literals, inject(), and environment constants.',
  },
  {
    emoji: '🗺️',
    title: 'Route Mapping',
    description:
      'Correlates Angular HTTP calls with NestJS endpoints using exact and partial matching with confidence scoring.',
  },
  {
    emoji: '🤖',
    title: 'AI Enrichment',
    description:
      'Optionally calls OpenAI or Anthropic to generate realistic request bodies, response assertions, and error case tests.',
  },
  {
    emoji: '🔐',
    title: 'Authentication',
    description:
      'Bearer JWT support via --auth-token, --auth-env, or .qa/auth.json with auto-login flow. No token hardcoding required.',
  },
  {
    emoji: '📊',
    title: 'HTML Reports',
    description:
      'Self-contained visual reports with delta vs. previous run, dark mode, run history, and custom branding.',
  },
  {
    emoji: '⚡',
    title: 'One Command',
    description:
      'The pipeline command runs scan → analyze → map → generate → run → report in sequence. CI-ready out of the box.',
  },
];

function HeroSection(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.installBlock}>
          <code>npx @npmoncada/ai-web-qa-tester pipeline --backend ./my-api --base-url http://localhost:3000</code>
        </div>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Get Started →
          </Link>
          <Link
            className="button button--outline button--lg"
            href="https://github.com/NeylaP/ai-web-qa-tester"
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureCard({ title, description, emoji }: Feature): ReactNode {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className="feature-card">
        <div className={styles.featureEmoji}>{emoji}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="AI-powered QA for Angular + NestJS"
      description="Scan your source code, map routes, generate Playwright tests, and produce HTML reports — all from one command."
    >
      <HeroSection />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.howItWorks}>
          <div className="container">
            <Heading as="h2" className="text--center">How it works</Heading>
            <div className={styles.pipeline}>
              {['Scan', 'Analyze', 'Map', 'Generate', 'Run', 'Report'].map((step, i) => (
                <div key={step} className={styles.pipelineStep}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <span className={styles.stepLabel}>{step}</span>
                </div>
              ))}
            </div>
            <p className="text--center" style={{ marginTop: '1rem', opacity: 0.75 }}>
              From zero to an HTML QA report in a single{' '}
              <code>pipeline</code> command.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
