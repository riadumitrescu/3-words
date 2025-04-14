'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import supabase from '@/lib/supabase';

type PlayerData = {
  name?: string;
  words: string[];
  createdAt: string;
};

export default function PlayPage() {
  const { id } = useParams();
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [friendName, setFriendName] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Set mounted state to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client-side after mounting
    if (!mounted || typeof id !== 'string') return;
    
    const fetchPlayerData = async () => {
      try {
        // First try to get data from Supabase (primary source)
        const { data, error } = await supabase
          .from('words')
          .select('player_name, friend_words, created_at')
          .eq('user_id', id)
          .ilike('friend_name', '%Self%') // Find the user's self-description
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          console.log('✅ Player data fetched from Supabase:', data);
          // Format the data to match our expected structure
          setPlayerData({
            name: data.player_name,
            words: data.friend_words,
            createdAt: data.created_at
          });
        } else {
          console.log('⚠️ Player data not found in Supabase, trying localStorage...');
          // Fallback to localStorage if Supabase doesn't have the data
          
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
        }
      } catch (err) {
        console.error('Error loading player data:', err);
        
        // Fallback to localStorage if Supabase fetch fails
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
        } catch (localError) {
          console.error('Error with localStorage fallback:', localError);
        }
      }
    };
    
    fetchPlayerData();
  }, [id, mounted]);

  // Check if all fields are filled
  useEffect(() => {
    const nameEntered = friendName.trim().length > 0;
    const allWordsFilled = words.every(word => word.trim().length > 0);
    setIsComplete(nameEntered && allWordsFilled);
  }, [friendName, words]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleSubmit = async () => {
    if (typeof id !== 'string' || !isComplete) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const createdAt = new Date().toISOString();
      const friendWordsData = {
        name: friendName,
        words,
        createdAt
      };
      
      // Save friend's name and words to localStorage for current comparison
      localStorage.setItem(`friendWords-${id}`, JSON.stringify(friendWordsData));
      
      // Save to localStorage as a fallback/replica of the Supabase database
      // Store all word entries in a structured format
      try {
        // Get existing entries array or initialize a new one
        const existingEntriesString = localStorage.getItem(`allWords-${id}`);
        const existingEntries = existingEntriesString 
          ? JSON.parse(existingEntriesString) 
          : [];
        
        // Add new entry with a unique ID
        const newEntry = {
          id: Date.now(), // Use timestamp as a simple unique ID
          user_id: id,
          friend_name: friendName,
          friend_words: words,
          created_at: createdAt
        };
        
        // Save updated entries array
        localStorage.setItem(
          `allWords-${id}`, 
          JSON.stringify([newEntry, ...existingEntries])
        );
        
        console.log('Successfully saved words to localStorage');
      } catch (localStorageError) {
        console.error('LocalStorage save error:', localStorageError);
      }
      
      // Try to save the data to Supabase
      try {
        console.log('Sending to Supabase:', { user_id: id, friend_name: friendName, friend_words: words });
        
        // First, make sure we're using the correct table
        const { error: testError } = await supabase
          .from('words')
          .select('count')
          .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
          console.error('Table does not exist:', testError.message);
          setError('Database table not found. Please set up the words table in Supabase.');
          setIsSubmitting(false);
          return;
        }
        
        // Attempt to insert the data - only include the required fields
        const { error } = await supabase
          .from('words')
          .insert([
            { 
              user_id: id, 
              player_name: playerData?.name || '', // Add the player's name
              friend_name: friendName, 
              friend_words: words
              // Note: id and created_at will be auto-generated by Supabase
            }
          ]);
          
        if (error) {
          console.error('Error saving to Supabase:', error.message);
          
          if (error.message.includes('violates row-level security policy')) {
            setError('Row security policy error. Administrator needs to run the SQL to fix RLS policies.');
            setIsSubmitting(false);
            return;
          }
          
          // Continue with navigation even if Supabase save fails
          // but add the error to localStorage for troubleshooting
          localStorage.setItem(`supabase-error-${Date.now()}`, JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString(),
            data: { user_id: id, friend_name: friendName }
          }));
        } else {
          console.log('✅ Successfully saved to Supabase');
          // You could add a toast notification here if desired
        }
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Store the error for debugging
        localStorage.setItem(`supabase-exception-${Date.now()}`, 
          JSON.stringify({ 
            error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
            timestamp: new Date().toISOString() 
          })
        );
        // Continue with navigation even if Supabase save fails
      }
      
      // Navigate to results page
      router.push(`/results/${id}`);
    } catch (err) {
      console.error('Error saving friend data:', err);
      setError('There was an error saving your response. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        <p className={styles.subtitle}>Help {playerName} understand how others see them.</p>
        
        <div className={styles.wordInputs}>
          <h2 className={styles.wordsTitle}>Your Name</h2>
          <div className={styles.wordContainer}>
            <label htmlFor="friendName" className="sr-only">
              Your Name
            </label>
            <input
              id="friendName"
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              className={styles.wordInput}
            />
          </div>
        
          <h2 className={styles.wordsTitle}>Choose 3 words that describe {playerName}</h2>
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
        
        {error && <p className={styles.errorMessage}>{error}</p>}
        
        <button 
          className={`${styles.continueButton} ${!isComplete || isSubmitting ? styles.buttonDisabled : ''}`}
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </main>
  );
} 