'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

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
    // Generate a unique ID
    const userId = crypto.randomUUID();
    
    // Save to localStorage
    localStorage.setItem(userId, JSON.stringify({
      words,
      createdAt: new Date().toISOString()
    }));
    
    // Redirect to invite page
    router.push(`/invite/${userId}`);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>How do you see yourself?</h1>
        <p className={styles.subtitle}>Choose 3 words that best describe you</p>
        
        <div className={styles.wordInputs}>
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
