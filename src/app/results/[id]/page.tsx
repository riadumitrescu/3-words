'use client';

import { useState, useEffect, useRef } from 'react';
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

// Keep API key temporarily hardcoded for development
const GEMINI_API_KEY = "AIzaSyDxvCyONeV1_BNVKiVBslJUAjO1Kon4Yq8";

export default function ResultsPage() {
  const { id } = useParams();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  // Set mounted state to ensure we only run client-side code after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof id !== 'string') return;
    
    // Get player data
    const storedPlayerData = localStorage.getItem(`playerData-${id}`);
    if (storedPlayerData) {
      try {
        setPlayerData(JSON.parse(storedPlayerData));
      } catch (e) {
        console.error('Error parsing playerData:', e);
      }
    } else {
      // Fallback to old format if needed
      const oldData = localStorage.getItem(id);
      if (oldData) {
        try {
          const parsedData = JSON.parse(oldData);
          setPlayerData({
            name: 'You', // Default name if not provided
            words: parsedData.words,
            createdAt: parsedData.createdAt
          });
        } catch (e) {
          console.error('Error parsing oldData:', e);
        }
      }
    }

    // Get friend's description data
    const storedFriendData = localStorage.getItem(`friendWords-${id}`);
    if (storedFriendData) {
      try {
        setFriendData(JSON.parse(storedFriendData));
      } catch (e) {
        console.error('Error parsing friendData:', e);
      }
    }
  }, [id, mounted]);

  useEffect(() => {
    // Generate analysis when both data sets are available
    const analyzeWords = async () => {
      if (!playerData || !friendData || !mounted) return;
      
      try {
        setLoading(true);
        
        // Send to Gemini API for analysis with updated prompt
        const prompt = `
        A person named ${playerData.name} described themselves with: [${playerData.words.join(', ')}]. 
        Their friend described them with: [${friendData.words.join(', ')}]. 
        Please compare them, find any overlapping or similar meanings, and return a percentage match from 0–100. 
        Include a 2–3 sentence reflection, and finish with: Score: ##%
        `;

        console.log('Sending request to Gemini API with prompt:', prompt);
        
        try {
          // Try v1beta endpoint with the specified model
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: prompt
                      }
                    ]
                  }
                ]
              })
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API response not OK (v1beta):', response.status, errorText);
            
            // If API key issues, use the fallback analysis
            console.log('API key issue detected, using fallback analysis');
            generateFallbackAnalysis();
            return;
          }
          
          const data = await response.json();
          console.log('Gemini API response:', data);
          
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          if (text) {
            processApiResponse(text);
          } else if (data.error) {
            console.error('Gemini API error:', data.error);
            generateFallbackAnalysis();
          } else {
            console.error('No valid response from Gemini API:', data);
            generateFallbackAnalysis();
          }
        } catch (apiError) {
          console.error('Error with API request:', apiError);
          generateFallbackAnalysis();
        }
      } catch (err) {
        console.error('Error analyzing words:', err);
        setError('Could not generate analysis. Please try again.');
        generateFallbackAnalysis();
      } finally {
        setLoading(false);
      }
    };

    // Process the API response text
    const processApiResponse = (text: string) => {
      // Extract the reflection part (everything before "Score:")
      const scoreIndex = text.lastIndexOf('Score:');
      if (scoreIndex !== -1) {
        setAnalysis(text.substring(0, scoreIndex).trim());
        
        // Extract score from the text (looking for "Score: XX%" pattern)
        const scoreMatch = text.substring(scoreIndex).match(/Score:\s*(\d+)%?/i);
        if (scoreMatch && scoreMatch[1]) {
          setScore(scoreMatch[1]);
        } else {
          // If pattern isn't found in expected format, try to find any number
          const numberMatch = text.substring(scoreIndex).match(/\d+/);
          if (numberMatch) {
            setScore(numberMatch[0]);
          } else {
            calculateBasicScore();
          }
        }
      } else {
        // If "Score:" text not found, use the whole response as analysis
        setAnalysis(text);
        calculateBasicScore();
      }
    };

    // Calculate a basic score based on direct word matches
    const calculateBasicScore = () => {
      if (!playerData || !friendData) return;
      
      const matchCount = playerData.words.filter(word => 
        friendData.words.some(friendWord => 
          friendWord.toLowerCase() === word.toLowerCase()
        )
      ).length;
      
      const matchPercentage = Math.round((matchCount / 3) * 100);
      setScore(`${matchPercentage}`);
    };

    // Generate a fallback analysis without using the API
    const generateFallbackAnalysis = () => {
      if (!playerData || !friendData) return;
      
      // Check for exact word matches
      const exactMatches = playerData.words.filter(word => 
        friendData.words.some(friendWord => 
          friendWord.toLowerCase() === word.toLowerCase()
        )
      );
      
      const matchCount = exactMatches.length;
      const matchPercentage = Math.round((matchCount / 3) * 100);
      
      // Generate analysis text based on match percentage
      let analysisText = '';
      const playerName = playerData.name;
      
      if (matchPercentage === 100) {
        analysisText = `Perfect match! ${playerName} and their friend have identical perceptions. All three words match exactly, showing complete alignment in how ${playerName} sees themselves and how others perceive them.`;
      } else if (matchPercentage >= 67) {
        analysisText = `Strong alignment! ${playerName} and their friend share similar perceptions. There's significant overlap in the chosen words, suggesting that ${playerName}'s self-image largely aligns with how others see them.`;
      } else if (matchPercentage >= 33) {
        analysisText = `Moderate alignment. ${playerName} and their friend have some overlap in perception, but also differences. This suggests that ${playerName} has some self-awareness, but there are aspects others see differently.`;
      } else if (matchPercentage > 0) {
        analysisText = `Limited alignment. ${playerName} and their friend have minimal overlap in their chosen words. This suggests a disconnect between self-perception and how others see ${playerName}.`;
      } else {
        analysisText = `No direct matches found between ${playerName}'s self-description and their friend's perception. This highlights how differently we can see ourselves compared to how others perceive us. These differences offer valuable opportunities for self-reflection.`;
      }
      
      setAnalysis(analysisText);
      setScore(`${matchPercentage}`);
    };
    
    analyzeWords();
  }, [playerData, friendData, mounted]);

  // Scroll to analysis when it's loaded
  useEffect(() => {
    if (mounted && !loading && analysis && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [loading, analysis, mounted]);

  // Don't render anything during SSR to prevent hydration errors
  if (!mounted) {
    return null;
  }

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
        
        <div className={styles.wordsComparison}>
          <div className={styles.wordColumn}>
            <h2 className={styles.wordHeader}>
              {playerData.name === 'You' ? 'Your Words' : `${playerData.name}&apos;s Words`}
            </h2>
            {playerData.words.map((word, index) => (
              <div key={`self-${index}`} className={`${styles.wordChip} ${styles.selfWord}`}>
                {word}
              </div>
            ))}
          </div>
          
          <div className={styles.wordColumn}>
            <h2 className={styles.wordHeader}>
              Friend&apos;s Words
            </h2>
            {friendData.words.map((word, index) => (
              <div key={`friend-${index}`} className={`${styles.wordChip} ${styles.friendWord}`}>
                {word}
              </div>
            ))}
          </div>
        </div>
        
        {score && !loading && (
          <div className={styles.scoreContainer}>
            <div className={styles.bigScore}>
              <span>This friend sees {playerData.name === 'You' ? 'you' : playerData.name}</span>
              <div className={styles.scoreValue}>{score}<span className={styles.scorePercent}>%</span></div>
              <span>as {playerData.name === 'You' ? 'you see yourself' : `${playerData.name} sees ${playerData.name === 'You' ? 'themself' : 'themselves'}`}</span>
            </div>
          </div>
        )}
        
        <div ref={analysisRef} className={`${styles.analysisCard} ${!loading && analysis ? styles.fadeIn : ''}`}>
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
              <h2 className={styles.analysisTitle}>Reflection</h2>
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