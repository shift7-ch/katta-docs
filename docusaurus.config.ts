import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Cryptomator Documentation',
  tagline: 'Protect your privacy in any cloud',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: process.env.SITE_URL || 'https://docs.cryptomator.org',
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'cryptomator',
  projectName: 'docs',
  trailingSlash: true,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
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
            'https://github.com/cryptomator/docs/tree/develop/',
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
            '/android/',
            '/desktop/',
            '/ios/',
            '/hub/',
            '/misc/',
            '/security/',
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
      title: 'CRYPTOMATOR',
      logo: {
        alt: 'Cryptomator Logo',
        src: 'img/logo.svg',
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
          activeBasePath: 'architecture/',
          position: 'left',
        },
        {
          label: 'Setup',
          to: 'setup/server-setup',
          activeBasePath: 'setup/',
          position: 'left',
        },
        {
          href: 'https://github.com/shif7-ch',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Cryptomator',
          items: [
            {
              label: 'Website',
              href: 'https://cryptomator.org/',
            },
            {
              label: 'Community',
              href: 'https://community.cryptomator.org/',
            },
          ],
        },
        {
          title: 'Contribute',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/cryptomator',
            },
            {
              label: 'Donate',
              href: 'https://cryptomator.org/donate/',
            },
            {
              label: 'Translate',
              href: 'https://translate.cryptomator.org/',
            },
          ],
        },
        {
          title: 'Follow Us',
          items: [
            {
              label: 'Blog',
              href: 'https://cryptomator.org/blog/',
            },
            {
              label: 'Mastodon',
              href: 'https://mastodon.online/@cryptomator',
            },
            {
              label: 'LinkedIn',
              href: 'https://linkedin.com/company/skymatic',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'Impressum',
              href: 'https://cryptomator.org/impressum/',
            },
            {
              label: 'Privacy Policy',
              href: 'https://cryptomator.org/privacy/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} cryptomator.org. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'ini'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;