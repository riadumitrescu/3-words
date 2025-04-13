'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

type PlayerData = {
  name: string;
  words: string[];
  createdAt: string;
};

type FriendData = {
  words: string[];
  createdAt: string;
};

// Keep API key in environment variable for security
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function ResultsPage() {
  const { id } = useParams();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof id === 'string') {
      // Get player data
      const storedPlayerData = localStorage.getItem(`playerData-${id}`);
      if (storedPlayerData) {
        setPlayerData(JSON.parse(storedPlayerData));
      } else {
        // Fallback to old format if needed
        const oldData = localStorage.getItem(id);
        if (oldData) {
          const parsedData = JSON.parse(oldData);
          setPlayerData({
            name: 'You', // Default name if not provided
            words: parsedData.words,
            createdAt: parsedData.createdAt
          });
        }
      }

      // Get friend's description data
      const storedFriendData = localStorage.getItem(`friendWords-${id}`);
      if (storedFriendData) {
        setFriendData(JSON.parse(storedFriendData));
      }
    }
  }, [id]);

  useEffect(() => {
    // Generate analysis when both data sets are available
    const analyzeWords = async () => {
      if (!playerData || !friendData) return;
      
      try {
        setLoading(true);
        
        // Calculate matching words score
        const matchCount = playerData.words.filter(word => 
          friendData.words.some(friendWord => 
            friendWord.toLowerCase() === word.toLowerCase()
          )
        ).length;
        
        const matchPercentage = Math.round((matchCount / 3) * 100);
        setScore(`${matchPercentage}`);
        
        // Send to Gemini API for analysis
        const prompt = `
        A person named ${playerData.name} described themselves with: "${playerData.words.join('", "')}"
        A friend described them with: "${friendData.words.join('", "')}"
        Compare the sets.
        - List exact and soft matches
        - Describe what this says about self-perception vs. how others see them
        - Give a match score from 0–100
        - Explain the score in 2 sentences
        `;
        
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
              }
            })
          }
        );
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          setAnalysis(data.candidates[0].content.parts[0].text);
        } else {
          setError('Could not generate analysis. Please try again.');
        }
      } catch (err) {
        console.error('Error analyzing words:', err);
        setError('Error generating analysis. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    analyzeWords();
  }, [playerData, friendData]);

  if (!playerData || !friendData) {
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
        <h1 className={styles.title}>Word Comparison</h1>
        
        <div className={styles.resultsContainer}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              How {playerData.name === 'You' ? 'you see yourself' : `${playerData.name} sees ${playerData.name === 'You' ? 'themself' : 'themselves'}`}
            </h2>
            <div className={styles.wordsList}>
              {playerData.words.map((word, index) => (
                <div key={`self-${index}`} className={styles.wordChip}>
                  {word}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              How a friend sees {playerData.name === 'You' ? 'you' : playerData.name}
            </h2>
            <div className={styles.wordsList}>
              {friendData.words.map((word, index) => (
                <div key={`friend-${index}`} className={styles.wordChip}>
                  {word}
                </div>
              ))}
            </div>
          </div>
          
          {score && (
            <div className={styles.scoreSection}>
              <div className={styles.scoreBox}>
                <span className={styles.scoreLabel}>Match Score:</span>
                <span className={styles.scoreValue}>{score}<span className={styles.scorePercent}>%</span></span>
              </div>
            </div>
          )}
        </div>
        
        <div className={`${styles.analysisCard} ${!loading && analysis ? styles.fadeIn : ''}`}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Analyzing the words...</p>
            </div>
          ) : error ? (
            <div className={styles.errorMessage}>
              {error}
              <button 
                onClick={() => window.location.reload()} 
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <h2 className={styles.analysisTitle}>Perception Analysis</h2>
              <div className={styles.analysisText}>
                {analysis.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </>
          )}
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