'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import supabase from '@/lib/supabase';

type PlayerData = {
  name?: string;
  words: string[];
  createdAt: string;
};

// Hardcoded production URL for sharing links
const PRODUCTION_URL = 'https://3-words.vercel.app';

export default function InvitePage() {
  const { userId } = useParams();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set mounted state after component mounts to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client-side after mounting
    if (!mounted) return;
    
    const fetchPlayerData = async () => {
      if (typeof userId !== 'string') return;
      
      setLoading(true);
      
      try {
        // First try to get data from Supabase (primary source)
        const { data, error } = await supabase
          .from('words')
          .select('player_name, friend_words, created_at')
          .eq('user_id', userId)
          .ilike('friend_name', '%(Self)%') // Properly matches the "(Self)" suffix
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
          const storedPlayerData = localStorage.getItem(`playerData-${userId}`);
          if (storedPlayerData) {
            setPlayerData(JSON.parse(storedPlayerData));
          } else {
            // Fallback to old format if needed
            const oldData = localStorage.getItem(userId);
            if (oldData) {
              setPlayerData(JSON.parse(oldData));
            }
          }
        }
        
        // Generate invite link using the production URL
        setInviteLink(`${PRODUCTION_URL}/play/${userId}`);
      } catch (err) {
        console.error('Error loading player data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlayerData();
  }, [userId, mounted]);

  const copyToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
    } else {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      
      document.body.removeChild(textArea);
    }
  };

  // Don't render during SSR to avoid hydration errors
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Loading...</h1>
          <div className={styles.loadingSpinner}></div>
        </div>
      </main>
    );
  }

  if (!playerData) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>User not found</h1>
          <p className={styles.subtitle}>We couldn&apos;t find your data. Please try again.</p>
          <Link href="/" className={styles.backButton}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const playerName = playerData.name || 'You';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Thank You, {playerName}!</h1>
        <p className={styles.subtitle}>
          You've described yourself with these three words:
        </p>
        
        <div className={styles.wordsList}>
          {playerData.words.map((word, index) => (
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
            <div className={styles.linkWrapper}>
              <span className={styles.linkIcon}>🔗</span>
              <input 
                type="text" 
                value={inviteLink} 
                readOnly 
                className={styles.linkInput} 
                aria-label="Public share link to send to friends"
              />
            </div>
            <button 
              onClick={copyToClipboard} 
              className={styles.copyButton}
            >
              Copy
            </button>
          </div>
          <p className={styles.linkNote}>
            This is a public link that anyone can access. No login required.
          </p>
        </div>
      </div>
    </main>
  );
} 