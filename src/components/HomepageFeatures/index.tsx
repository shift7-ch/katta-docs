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
    title: 'Introduction',
    link: '/introduction/intro',
    description: (
      <>
        Get to know Katta and learn how secure S3 access works for you and your team.
      </>
    ),
  },
  {
    title: 'Architecture',
    link: '/arch/architecture',
    description: (
      <>
        Understand how Katta combines Mountain Duck, client-side encryption, and Keycloak under the hood.
      </>
    ),
  },
  {
    title: 'Setup',
    link: '/setup/server-setup',
    description: (
      <>
        Step-by-step guides for deploying the Katta server and connecting your S3 buckets.
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
