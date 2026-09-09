import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import FrameBorders from './FrameBorders';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'User Guide',
    link: '/user-guide',
    description: (
      <>
        Install Katta Desktop on macOS or Windows, sign in, and create your first vault.
      </>
    ),
  },
  {
    title: 'Admin Guide',
    link: '/admin-guide',
    description: (
      <>
        Define where your users can create vaults, and who is allowed to create them.
      </>
    ),
  },
  {
    title: 'Self-Hosting Guide',
    link: '/self-hosting-guide',
    description: (
      <>
        Deploy Katta Server on your own infrastructure and connect it to AWS S3 or MinIO.
      </>
    ),
  },
];

function Feature({title, description, link}: FeatureItem) {
  return (
    <div className={styles.feature}>
      <FrameBorders />
      <Heading as="h3">
        <Link to={link} className="text--no-decoration">
          {title}
        </Link>
      </Heading>
      <p className={styles.featureBody}>{description}</p>
      <Link
        className="button button--primary button--block"
        to={link}>
        Learn More
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={clsx('container padding-vert--lg', styles.features)}>
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
