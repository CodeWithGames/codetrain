import WaveDivider from '../components/WaveDivider';
import Header from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';
import Accordion from '../components/Accordion';

import firebase from 'firebase/app';
import signInWithGoogle from '../util/signInWithGoogle';

import styles from '../styles/pages/Index.module.css';

export default function Index() {
  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.top}>
        <div className={styles.logo}>
          <Image
            src="/img/logo.png"
            width="96"
            height="96"
            alt="logo"
            quality={100}
          />
        </div>
        <h2>Codetrain makes gamedev easier than ever.</h2>
        <p>No downloads, no dependencies: <b>create retro games right from your browser.</b><br />
        Easily export to HTML for portability. Explore and remix projects from
        the community.</p>
        <div className={styles.links}>
          <Link href="/create">
            <a>Create</a>
          </Link>
          <Link href="/explore">
            <a>Explore</a>
          </Link>
          <Link href="/docs">
            <a>Docs</a>
          </Link>
        </div>
      </div>
      <div className={styles.middle}>
        <WaveDivider color="var(--secondary)" />
        <div className={styles.banner} />
      </div>
      <div className={styles.bottom}>
        <div className={styles.accordion}>
          <Accordion title="What is Codetrain?">
            Codetrain is a retro game engine in the browser.
          </Accordion>
          <Accordion title="Who is Codetrain for?">
            Everyone. Whether you&apos;re a beginner looking to learn more about
            game development or an expert looking to challenge themselves in a
            constrained environment, Codetrain provides a platform for you.
          </Accordion>
          <Accordion title="How can I get started?">
            Check out our{' '}
            <Link href="/docs">
              <a>docs</a>
            </Link>
            {' '}or jump straight into the{' '}
            <Link href="/create">
              <a>engine</a>
            </Link>.
          </Accordion>
          <Accordion title="Can I contribute?">
            Codetrain is open source. Want to contribute? Find our GitHub
            {' '}repository <a
              href="https://github.com/codeconvoy/codetrain"
              target="_blank"
              rel="noopener noreferrer"
            >here</a>.
          </Accordion>
        </div>
      </div>
      <div className="flexfill" />
      <div className={styles.footer}>
        &copy;{' '}
        <a href="https://codeconvoy.org">CodeConvoy</a>
        {' ' + new Date().getFullYear()}
      </div>
    </div>
  );
}
