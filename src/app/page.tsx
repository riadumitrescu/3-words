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
      // 1. Generate a unique ID
      const userId = crypto.randomUUID();
      console.log('🔑 Generated user_id:', userId);
      
      // 2. Prepare the data to be inserted
      const playerData = {
        user_id: userId,
        player_name: name.trim(),
        friend_name: `${name.trim()} (Self)`,
        friend_words: words.map(w => w.trim())
      };
      
      console.log('📦 Data to insert into Supabase:', playerData);
      
      // 3. Save to localStorage as backup only
      try {
        localStorage.setItem(`playerData-${userId}`, JSON.stringify({
          name: name.trim(),
          words: words.map(w => w.trim()),
          createdAt: new Date().toISOString()
        }));
        console.log('✅ Backup: Data saved to localStorage');
      } catch (localStorageError) {
        console.warn('⚠️ Failed to save to localStorage:', localStorageError);
        // Continue anyway - Supabase is our primary storage
      }
      
      // 4. Insert the data into Supabase
      console.log('🔄 Inserting data into Supabase...');
      
      const { data: insertedData, error: insertError } = await supabase
        .from('words')
        .insert([playerData])
        .select();
      
      // 5. Handle Supabase errors
      if (insertError) {
        console.error('❌ Supabase insert failed:', insertError);
        
        // Handle specific error types
        if (insertError.message?.includes('violates row-level security policy')) {
          setError('Database security policy error. Contact the administrator.');
          throw new Error(`RLS policy error: ${insertError.message}`);
        } else if (insertError.message?.includes('does not exist')) {
          setError('Database table not found. Contact the administrator.');
          throw new Error(`Table error: ${insertError.message}`);
        } else {
          setError(`Failed to save data: ${insertError.message}`);
          throw new Error(`Supabase error: ${insertError.message}`);
        }
      }
      
      // 6. Verify that data was inserted
      console.log('🔍 Verifying data was inserted...');
      
      // Immediately verify the insert was successful
      const { data: verificationData, error: verificationError } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .ilike('friend_name', '%(Self)%')
        .single();
      
      if (verificationError || !verificationData) {
        console.error('❌ Verification failed:', verificationError || 'No data returned');
        setError('Data verification failed. Your data might not be accessible across devices.');
        throw new Error('Verification failed: Data not found after insert');
      }
      
      // 7. Success - data confirmed to be in the database
      console.log('✅ Supabase verification successful:', verificationData);
      console.log('🚀 Redirecting to invite page with user_id:', userId);
      
      // 8. Only redirect after confirmed success
      router.push(`/invite/${userId}`);
    } catch (err) {
      console.error('❌ Error in submit process:', err);
      setError(err instanceof Error ? err.message : 'Failed to save your data. Please try again.');
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
