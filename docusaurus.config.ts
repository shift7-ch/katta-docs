import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Katta Documentation',
  tagline: 'Secure Your S3 Buckets',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: process.env.SITE_URL || 'https://docs.katta.cloud',
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'shift7-ch',
  projectName: 'katta-docs',
  trailingSlash: true,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/shift7-ch/katta-docs/tree/main/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  clientModules: [
    require.resolve('./src/clientModules/utmRemover.ts'),
  ],

  headTags: [ ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [ ],
      },
    ],
    [
      '@signalwire/docusaurus-plugin-llms-txt',
      {
        content: {
          enableLlmsFullTxt: true,
          excludeRoutes: [
            '/',
            '/search/',
          ],
        },
      },
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: "/",
        hashed: true,
      }),
    ],
    '@docusaurus/theme-mermaid'
  ],

  themeConfig: {
    image: 'img/og-image.png',
    navbar: {
      title: 'Katta',
      logo: {
        alt: 'Katta Logo',
        src: 'img/katta-logo.png',
      },
      items: [
        {
          label: 'Introduction',
          to: 'introduction/intro',
          activeBasePath: 'introduction/',
          position: 'left',
        },
        {
          label: 'Architecture',
          to: 'arch/architecture',
          activeBasePath: 'arch/',
          position: 'left',
        },
        {
          label: 'Setup',
          to: 'setup/server-setup',
          activeBasePath: 'setup/',
          position: 'left',
        },
        {
          href: 'https://github.com/shift7-ch',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [],
      copyright: `
        <div>Made by shift7 GmbH</div>
        <div class="footer__mastodon">
          <a href="https://mastodon.social/@kattacloud" target="_blank" rel="noopener noreferrer" aria-label="Follow Katta on Mastodon">
            <svg viewBox="0 0 640 640" aria-hidden="true"><path d="M529 243.1C529 145.9 465.3 117.4 465.3 117.4C402.8 88.7 236.7 89 174.8 117.4C174.8 117.4 111.1 145.9 111.1 243.1C111.1 358.8 104.5 502.5 216.7 532.2C257.2 542.9 292 545.2 320 543.6C370.8 540.8 399.3 525.5 399.3 525.5L397.6 488.6C397.6 488.6 361.3 500 320.5 498.7C280.1 497.3 237.5 494.3 230.9 444.7C230.3 440.1 230 435.4 230 430.8C315.6 451.7 388.7 439.9 408.7 437.5C464.8 430.8 513.7 396.2 519.9 364.6C529.7 314.8 528.9 243.1 528.9 243.1zM453.9 368.3L407.3 368.3L407.3 254.1C407.3 204.4 343.3 202.5 343.3 261L343.3 323.5L297 323.5L297 261C297 202.5 233 204.4 233 254.1L233 368.3L186.3 368.3C186.3 246.2 181.1 220.4 204.7 193.3C230.6 164.4 284.5 162.5 308.5 199.4L320.1 218.9L331.7 199.4C355.8 162.3 409.8 164.6 435.5 193.3C459.2 220.6 453.9 246.3 453.9 368.3L453.9 368.3z"/></svg>
            <span>@kattacloud@mastodon.social</span>
          </a>
        </div>
        <div>
          <a href="https://katta.cloud/impressum/">Impressum</a> • <a href="https://katta.cloud/privacy/">Privacy Policy</a>
        </div>
      `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'ini'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;