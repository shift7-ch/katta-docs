import useBaseUrl from '@docusaurus/useBaseUrl';
import type { ReactNode } from 'react';

import styles from './FrameBorders.module.css';

export default function FrameBorders(): ReactNode {
  const corner = useBaseUrl('/img/top-left-corner.svg');
  const topSide = useBaseUrl('/img/top-side.svg');
  const leftSide = useBaseUrl('/img/left-side.svg');
  return (
    <>
      <img className={styles.cornerTL} src={corner} alt="" aria-hidden="true" />
      <img className={styles.cornerTR} src={corner} alt="" aria-hidden="true" />
      <img className={styles.cornerBR} src={corner} alt="" aria-hidden="true" />
      <img className={styles.cornerBL} src={corner} alt="" aria-hidden="true" />
      <span className={styles.sideTop} style={{backgroundImage: `url(${topSide})`}} />
      <span className={styles.sideRight} style={{backgroundImage: `url(${leftSide})`}} />
      <span className={styles.sideBottom} style={{backgroundImage: `url(${topSide})`}} />
      <span className={styles.sideLeft} style={{backgroundImage: `url(${leftSide})`}} />
    </>
  );
}
