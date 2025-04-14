'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const [name, setName] = useState('');
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Set mounted state to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if all required fields are filled
  useEffect(() => {
    const nameEntered = name.trim().length > 0;
    const allWordsFilled = words.every(word => word.trim().length > 0);
    setIsComplete(nameEntered && allWordsFilled);
  }, [name, words]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleSubmit = () => {
    try {
      // Generate a unique ID
      const userId = crypto.randomUUID();
      
      // Save to localStorage with new format
      localStorage.setItem(`playerData-${userId}`, JSON.stringify({
        name,
        words,
        createdAt: new Date().toISOString()
      }));
      
      // Also save in original format for backward compatibility
      localStorage.setItem(userId, JSON.stringify({
        words,
        createdAt: new Date().toISOString()
      }));
      
      // Redirect to invite page
      router.push(`/invite/${userId}`);
    } catch (err) {
      console.error('Error saving data:', err);
      alert('There was an error saving your data. Please try again.');
    }
  };

  // Only render after mounting to avoid hydration errors
  if (!mounted) {
    return null;
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>How do you see yourself?</h1>
        <p className={styles.subtitle}>Share your self-perspective</p>
        
        <div className={styles.nameInput}>
          <label htmlFor="name" className={styles.nameLabel}>
            Your Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            className={styles.nameField}
          />
        </div>
        
        <div className={styles.wordInputs}>
          <h2 className={styles.wordsTitle}>Choose 3 words that best describe you</h2>
          {words.map((word, index) => (
            <div key={index} className={styles.wordContainer}>
              <label htmlFor={`word-${index+1}`} className="sr-only">
                Word {index + 1}
              </label>
              <input
                id={`word-${index+1}`}
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
          Continue
        </button>
    </div>
    </main>
  );
}
