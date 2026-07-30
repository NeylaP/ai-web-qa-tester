import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['intro', 'installation', 'quickstart'],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/full-tutorial',
        'guides/authentication',
        'guides/ai-enrichment',
        'guides/html-report',
        'guides/ci-github-actions',
      ],
    },
    {
      type: 'doc',
      id: 'cli-reference',
      label: 'CLI Reference',
    },
    {
      type: 'category',
      label: 'Examples',
      items: ['examples/angular-nestjs'],
    },
    {
      type: 'doc',
      id: 'faq',
      label: 'FAQ & Troubleshooting',
    },
  ],
};

export default sidebars;
