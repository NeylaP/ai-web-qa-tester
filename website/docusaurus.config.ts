import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ai-web-qa-tester',
  tagline: 'AI-powered QA automation for Angular + NestJS projects',
  favicon: 'img/favicon.ico',

  url: 'https://npmoncada.github.io',
  baseUrl: '/ai-web-qa-tester/',

  organizationName: 'npmoncada',
  projectName: 'ai-web-qa-tester',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr' },
      es: { label: 'Español', direction: 'ltr' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/NeylaP/ai-web-qa-tester/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'ai-web-qa-tester',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/NeylaP/ai-web-qa-tester',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'CLI Reference', to: '/docs/cli-reference' },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/NeylaP/ai-web-qa-tester',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@npmoncada/ai-web-qa-tester',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ai-web-qa-tester. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
    algolia: undefined,
  } satisfies Preset.ThemeConfig,
};

export default config;
