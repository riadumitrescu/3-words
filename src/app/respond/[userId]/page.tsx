'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function RespondPage() {
  const { userId } = useParams();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Describe Your Friend</h1>
        <p className={styles.subtitle}>
          This is a placeholder for the response page where friends would describe the person who shared this link.
        </p>
        <div className={styles.infoBox}>
          <p>User ID: {userId}</p>
          <p>This part of the app would allow friends to enter their own 3 words to describe this person.</p>
        </div>
        <Link href="/" className={styles.backButton}>
          Back to Home
        </Link>
      </div>
    </main>
  );
} 