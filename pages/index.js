import Image from 'next/image';

import firebase from 'firebase/app';
import signInWithGoogle from '../util/signInWithGoogle.js';

import styles from '../styles/pages/Index.module.css';

export default function Index() {
  return (
    <div className={styles.container}>
      <div className={styles.center}>
        <div className={styles.title}>
          <Image src="/logo.png" height="48" width="48" alt="logo" />
          <h1>Codetrain</h1>
        </div>
        <div className={styles.button}>
          {
            firebase.auth().currentUser ?
            <button onClick={() => firebase.auth().signOut()}>
              Sign Out
            </button> :
            <button onClick={signInWithGoogle}>
              Sign In
            </button>
          }
        </div>
        <h2>What is Codetrain?</h2>
        <p>Codetrain is an educational browser game engine. Our goal is to lower
        the barrier of entry into scripted programming languages.</p>
        <h2>What makes Codetrain special?</h2>
        <p>We aim to teach JavaScript, a real-world programming language, in an
        engaging, game-ified environment. Whether you are a programming expert or
        a complete beginner, the Codetrain engine aims to provide just the right
        amount of complexity abstraction to make creating fun.</p>
        <h2>How can I get started?</h2>
        <p>If you are a complete beginner, you can take a look at our Codetrain
        engine tutorials, which will take you through the basics of the JavaScript
        programming language on your way to creating your first games. If you are
        more advanced and looking to jump straight into the engine, you can check
        out our documentation.</p>
        <h2>Can I contribute?</h2>
        <p>
          Codetrain is open source. Want to contribute? Find our GitHub repository
          {' '}
          <a
            href="https://github.com/codeconvoy/codetrain"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
