'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

type UserData = {
  words: string[];
  createdAt: string;
};

export default function ResultsPage() {
  const { id } = useParams();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [friendData, setFriendData] = useState<UserData | null>(null);

  useEffect(() => {
    if (typeof id === 'string') {
      // Get original user data
      const storedUserData = localStorage.getItem(id);
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }

      // Get friend's description data
      const storedFriendData = localStorage.getItem(`friendWords-${id}`);
      if (storedFriendData) {
        setFriendData(JSON.parse(storedFriendData));
      }
    }
  }, [id]);

  if (!userData || !friendData) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Data not found</h1>
          <p className={styles.subtitle}>
            We couldn't find the necessary data. The link might be invalid or expired.
          </p>
          <Link href="/" className={styles.button}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Results</h1>
        
        <div className={styles.resultsContainer}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>How you described yourself:</h2>
            <div className={styles.wordsList}>
              {userData.words.map((word, index) => (
                <div key={`self-${index}`} className={styles.wordChip}>
                  {word}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>How your friend sees you:</h2>
            <div className={styles.wordsList}>
              {friendData.words.map((word, index) => (
                <div key={`friend-${index}`} className={styles.wordChip}>
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className={styles.actions}>
          <Link href="/" className={styles.button}>
            Start Over
          </Link>
        </div>
      </div>
    </main>
  );
} 