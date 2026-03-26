import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import type { ReactNode } from 'react';

type FeatureItem = {
  title: string;
  description: ReactNode;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Introduction',
    link: '/introduction/intro',
    description: (
      <>
        Documentation for Cryptomator on Windows, macOS, and Linux.
        Create vaults, manage encrypted files, and configure settings.
      </>
    ),
  },
  {
    title: 'Architecture',
    link: '/arch/architecture',
    description: (
      <>
        Documentation for Cryptomator on Windows, macOS, and Linux.
        Create vaults, manage encrypted files, and configure settings.
      </>
    ),
  },
  {
    title: 'Setup',
    link: '/setup/server-setup',
    description: (
      <>
        Documentation for Cryptomator on Windows, macOS, and Linux.
        Create vaults, manage encrypted files, and configure settings.
      </>
    ),
  },
];

function Feature({title, description, link}: FeatureItem) {
  return (
    <div className="card" style={{height: '100%'}}>
      <div className="card__header">
        <Heading as="h3">
          <Link to={link} className="text--no-decoration">
            {title}
          </Link>
        </Heading>
      </div>
      <div className="card__body">
        <p>{description}</p>
      </div>
      <div className="card__footer">
        <Link
          className="button button--secondary button--block"
          to={link}>
          Learn More
        </Link>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className="container padding-vert--lg">
      <div className="row">
        {FeatureList.map((props, idx) => (
          <div key={idx} className="col col--4 margin-bottom--lg">
            <Feature {...props} />
          </div>
        ))}
      </div>
    </section>
  );
}
