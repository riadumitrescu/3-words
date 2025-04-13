'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function InvitePage() {
  const { userId } = useParams();
  const [userData, setUserData] = useState<{ words: string[] } | null>(null);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    if (typeof userId === 'string') {
      const storedData = localStorage.getItem(userId);
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
      
      // Generate invite link
      const origin = window.location.origin;
      setInviteLink(`${origin}/play/${userId}`);
    }
  }, [userId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Link copied to clipboard!');
  };

  if (!userData) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>User not found</h1>
          <p className={styles.subtitle}>We couldn't find your data. Please try again.</p>
          <Link href="/" className={styles.backButton}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Thank You!</h1>
        <p className={styles.subtitle}>
          You've described yourself with these three words:
        </p>
        
        <div className={styles.wordsList}>
          {userData.words.map((word, index) => (
            <div key={index} className={styles.wordChip}>
              {word}
            </div>
          ))}
        </div>
        
        <div className={styles.inviteSection}>
          <h2 className={styles.inviteTitle}>Now, invite others to describe you</h2>
          <p className={styles.inviteDescription}>
            Share this link with friends to see how they perceive you
          </p>
          
          <div className={styles.linkContainer}>
            <input 
              type="text" 
              value={inviteLink} 
              readOnly 
              className={styles.linkInput} 
            />
            <button 
              onClick={copyToClipboard} 
              className={styles.copyButton}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </main>
  );
} 