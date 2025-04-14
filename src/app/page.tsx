'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import supabase from '@/lib/supabase';

export default function Home() {
  const [name, setName] = useState('');
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async () => {
    if (!isComplete) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Generate a unique ID
      const userId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      
      // Save to localStorage with new format
      localStorage.setItem(`playerData-${userId}`, JSON.stringify({
        name,
        words,
        createdAt
      }));
      
      // Also save in original format for backward compatibility
      localStorage.setItem(userId, JSON.stringify({
        words,
        createdAt
      }));
      
      // Try to save the player data to Supabase
      try {
        console.log('Saving player data to Supabase:', { user_id: userId, friend_name: name, friend_words: words });
        
        // First, check if the table exists
        const { error: testError } = await supabase
          .from('words')
          .select('count')
          .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
          console.error('Table does not exist:', testError.message);
          // Continue with navigation even if Supabase save fails
        } else {
          // Save player's own words to Supabase - ONLY include required fields
          const { error } = await supabase
            .from('words')
            .insert([
              { 
                user_id: userId, 
                player_name: name, // Store the player's name as a separate field
                friend_name: `${name} (Self)`, // Mark this as the player's own words
                friend_words: words
                // Do NOT include id or created_at - let Supabase generate these
              }
            ]);
            
          if (error) {
            console.error('Error saving player data to Supabase:', error.message);
            
            if (error.message.includes('violates row-level security policy')) {
              console.warn('Row security policy error. Please run the SQL command to fix RLS policies.');
              // Continue with navigation even if Supabase save fails
            }
          } else {
            console.log('✅ Successfully saved player data to Supabase');
          }
        }
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Continue with navigation even if Supabase save fails
      }
      
      // Redirect to invite page
      router.push(`/invite/${userId}`);
    } catch (err) {
      console.error('Error saving data:', err);
      setError('There was an error saving your data. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        
        {error && <p className={styles.errorMessage}>{error}</p>}
        
        <button 
          className={`${styles.continueButton} ${!isComplete || isSubmitting ? styles.buttonDisabled : ''}`}
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </main>
  );
}
