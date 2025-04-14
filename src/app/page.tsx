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
      
      console.log('🔑 Generated user_id:', userId);
      
      // Save to localStorage with new format as a fallback
      localStorage.setItem(`playerData-${userId}`, JSON.stringify({
        name,
        words,
        createdAt
      }));
      console.log('✅ Saved player data to localStorage');
      
      // Also save in original format for backward compatibility
      localStorage.setItem(userId, JSON.stringify({
        words,
        createdAt
      }));
      
      // Save the player data to Supabase - this is the primary storage
      let supabaseSuccess = false;
      
      try {
        console.log('🔄 Checking if Supabase table exists...');
        
        // First, check if the table exists
        const { error: testError } = await supabase
          .from('words')
          .select('count')
          .limit(1);
        
        if (testError) {
          if (testError.message.includes('does not exist')) {
            console.error('❌ Table does not exist:', testError.message);
            setError('Database table not found. Please contact the administrator.');
            throw new Error('Table does not exist: ' + testError.message);
          } else {
            console.error('❌ Error checking table:', testError.message);
            throw new Error('Error checking table: ' + testError.message);
          }
        }
        
        console.log('🔄 Inserting player data to Supabase...');
        console.log('📦 Data to insert:', { 
          user_id: userId, 
          player_name: name,
          friend_name: `${name} (Self)`, 
          friend_words: words 
        });
        
        // Save player's own words to Supabase - ONLY include required fields
        const { data, error } = await supabase
          .from('words')
          .insert([
            { 
              user_id: userId, 
              player_name: name,
              friend_name: `${name} (Self)`, // Mark this as the player's own words
              friend_words: words
              // Do NOT include id or created_at - let Supabase generate these
            }
          ])
          .select(); // Add this to get the inserted records back
            
        if (error) {
          console.error('❌ Error saving player data to Supabase:', error);
          
          if (error.message.includes('violates row-level security policy')) {
            setError('Database permission error. Please contact the administrator.');
            throw new Error('RLS policy error: ' + error.message);
          } else {
            setError('Error saving your data. Please try again.');
            throw new Error('Supabase insert error: ' + error.message);
          }
        }
        
        if (data && data.length > 0) {
          console.log('✅ Successfully saved player data to Supabase:', data[0]);
          supabaseSuccess = true;
        } else {
          console.warn('⚠️ No data returned from insert operation');
          // We'll still consider this a success since there was no error
          supabaseSuccess = true;
        }
        
        // Verify the data was actually inserted
        console.log('🔄 Verifying data was inserted...');
        const { data: verifyData, error: verifyError } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .ilike('friend_name', '%(Self)%')
          .single();
        
        if (verifyError) {
          console.error('❌ Error verifying insert:', verifyError);
          // We'll still proceed since the initial insert didn't error
        } else if (verifyData) {
          console.log('✅ Verified data exists in Supabase:', verifyData);
          supabaseSuccess = true;
        } else {
          console.error('❌ Could not verify data was inserted');
          setError('Your data was saved locally but may not be available across devices.');
          // We'll still proceed since localStorage has the data
        }
      } catch (supabaseError) {
        console.error('❌ Supabase operation failed:', supabaseError);
        setError('Error saving your data. Please try again or contact support.');
        // Don't redirect if Supabase insert failed completely
        setIsSubmitting(false);
        return;
      }
      
      if (supabaseSuccess) {
        console.log('🚀 Supabase insert successful, redirecting to invite page...');
        // Only redirect if Supabase insert was successful
        router.push(`/invite/${userId}`);
      } else {
        console.error('❌ Supabase insert failed, not redirecting');
        setError('There was an error saving your data. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Error in submit process:', err);
      setError('There was an error saving your data. Please try again.');
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
