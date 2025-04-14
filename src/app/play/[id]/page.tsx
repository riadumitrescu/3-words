'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

type PlayerData = {
  name?: string;
  words: string[];
  createdAt: string;
};

export default function PlayPage() {
  const { id } = useParams();
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [isComplete, setIsComplete] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Set mounted state to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client-side after mounting
    if (!mounted || typeof id !== 'string') return;
    
    try {
      // Try to get data in new format first
      const storedPlayerData = localStorage.getItem(`playerData-${id}`);
      if (storedPlayerData) {
        setPlayerData(JSON.parse(storedPlayerData));
      } else {
        // Fallback to old format if needed
        const oldData = localStorage.getItem(id);
        if (oldData) {
          setPlayerData(JSON.parse(oldData));
        }
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    }
  }, [id, mounted]);

  // Check if all words are filled
  useEffect(() => {
    const allWordsFilled = words.every(word => word.trim().length > 0);
    setIsComplete(allWordsFilled);
  }, [words]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleSubmit = () => {
    if (typeof id === 'string') {
      try {
        // Save friend&apos;s words to localStorage
        localStorage.setItem(`friendWords-${id}`, JSON.stringify({
          words,
          createdAt: new Date().toISOString()
        }));
        
        // Navigate to results page
        router.push(`/results/${id}`);
      } catch (err) {
        console.error('Error saving friend data:', err);
        alert('There was an error saving your response. Please try again.');
      }
    }
  };

  // Don't render during SSR to prevent hydration errors
  if (!mounted) {
    return null;
  }

  if (!playerData) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>User not found</h1>
          <p className={styles.subtitle}>We couldn&apos;t find this user. The link might be invalid or expired.</p>
        </div>
      </main>
    );
  }

  const playerName = playerData.name || 'your friend';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Describe {playerName}</h1>
        <p className={styles.subtitle}>Enter 3 words you&apos;d use to describe {playerName}.</p>
        
        <div className={styles.wordInputs}>
          {words.map((word, index) => (
            <div key={index} className={styles.wordContainer}>
              <label htmlFor={`friend-word-${index+1}`} className="sr-only">
                Word {index + 1}
              </label>
              <input
                id={`friend-word-${index+1}`}
                type="text"
                value={word}
                onChange={(e) => handleWordChange(index, e.target.value)}
                placeholder={`Word ${index + 1}`}
                maxLength={20}
                className={styles.wordInput}
              />
            </div>
          ))}
        </div>
        
        <button 
          className={`${styles.continueButton} ${!isComplete ? styles.buttonDisabled : ''}`}
          onClick={handleSubmit}
          disabled={!isComplete}
        >
          Submit
        </button>
      </div>
    </main>
  );
} 