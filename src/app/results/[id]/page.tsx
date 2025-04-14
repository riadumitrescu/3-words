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

// API key hardcoded for public use - This is intentionally exposed for educational purposes
// In a production environment, you would use environment variables (.env.local) and server-side API calls
const GEMINI_API_KEY = 'AIzaSyDxvCyONeV1_BNVKiVBslJUAjO1Kon4Yq8';
// Update to gemini-1.0-pro model which should be more available
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent';

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
      console.log("🧠 mounted:", mounted);
      console.log("📦 playerData:", playerData);
      console.log("🎯 friendData:", friendData);
      
      if (!playerData || !friendData || !mounted) {
        console.log("⛔ Not all required data is available, skipping analysis");
        return;
      }
      
      try {
        setLoading(true);
        console.log("🔄 Starting analysis process for:", playerData.name);
        
        // Send to Gemini API for analysis with updated prompt
        // Shorter prompt for better reliability
        const prompt = `
        A person named ${playerData.name} described themselves as: [${playerData.words.join(', ')}]. 
        Their friend described them as: [${friendData.words.join(', ')}]. 
        
        What does this tell us about the difference between self-perception and external perception?
        Find connections between similar words. Analyze what this reveals about how ${playerData.name} sees themselves vs how others see them.
        
        Make your response engaging and insightful.
        End with: Score: XX% (where XX is your assessment of alignment from 0-100).
        `;

        console.log('🔍 Building request with prompt length:', prompt.length);
        
        // Format the request payload
        const requestPayload = {
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        };
        
        // SERVER API ROUTE STRATEGY
        // Going all-in with the server-side route which is most reliable
        console.log('🔄 Using server API route with gemini-pro model...');
        try {
          console.log('📤 Sending request to server API route...');
          const serverResponse = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gemini-pro', // Our best hope for a working model
              contents: requestPayload.contents
            })
          });
          
          console.log('📥 Server API route response status:', serverResponse.status);
          
          if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            console.log('✅ Server API route response received');
            
            // Check if there's an error field in the response
            if (serverData.error) {
              console.error('❌ Error in server response:', serverData.error);
              throw new Error(serverData.error.message || 'Unknown server error');
            }
            
            const serverText = serverData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log('📝 Response text received from server, length:', serverText.length);
            
            if (serverText) {
              console.log('✅ Processing valid server API response text');
              processApiResponse(serverText);
              return; // Exit early with successful response
            } else {
              console.error('❌ Empty response text from server');
              throw new Error('Empty response from server');
            }
          } else {
            const errorText = await serverResponse.text();
            console.error('❌ Server API route error:', serverResponse.status, errorText);
            throw new Error(`Server API error: ${serverResponse.status}`);
          }
        } catch (serverError) {
          console.error('❌ Error with server API request:', serverError);
          console.log('⚠️ Server API failed, using fallback analysis');
          generateFallbackAnalysis();
        } finally {
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Error analyzing words:', err);
        setError('Could not generate analysis. Please try again.');
        generateFallbackAnalysis();
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
      
      // Check for exact word matches and semantically similar words
      const exactMatches = playerData.words.filter(word => 
        friendData.words.some(friendWord => 
          friendWord.toLowerCase() === word.toLowerCase()
        )
      );
      
      // Simple semantic groupings to find similar words
      const semanticGroups: string[][] = [
        // Personality traits
        ['kind', 'caring', 'compassionate', 'generous', 'empathetic', 'loving', 'warm', 'gentle', 'supportive'],
        ['intelligent', 'smart', 'clever', 'bright', 'brilliant', 'wise', 'sharp', 'analytical', 'thoughtful'],
        ['creative', 'artistic', 'innovative', 'imaginative', 'original', 'unconventional'],
        ['funny', 'humorous', 'witty', 'comedic', 'entertaining', 'amusing', 'playful'],
        ['determined', 'persistent', 'driven', 'focused', 'dedicated', 'committed', 'ambitious', 'motivated'],
        ['confident', 'self-assured', 'bold', 'assertive', 'strong', 'courageous', 'brave'],
        ['calm', 'peaceful', 'relaxed', 'composed', 'tranquil', 'serene', 'laid-back', 'patient'],
        ['honest', 'truthful', 'genuine', 'authentic', 'sincere', 'transparent', 'real', 'trustworthy'],
        ['organized', 'methodical', 'systematic', 'orderly', 'structured', 'neat', 'tidy'],
        ['loyal', 'faithful', 'devoted', 'dependable', 'reliable', 'trustworthy', 'committed'],
        ['energetic', 'lively', 'vibrant', 'dynamic', 'active', 'spirited', 'enthusiastic', 'passionate'],
        ['shy', 'reserved', 'quiet', 'introverted', 'private', 'withdrawn', 'timid'],
        ['outgoing', 'extroverted', 'sociable', 'friendly', 'gregarious', 'cheerful', 'approachable'],
      ];
      
      // Find semantically similar words
      interface WordPair {
        playerWord: string;
        friendWord: string;
        group: string[];
      }
      
      const similarPairs: WordPair[] = [];
      playerData.words.forEach(playerWord => {
        friendData.words.forEach(friendWord => {
          if (playerWord.toLowerCase() === friendWord.toLowerCase()) return; // Skip exact matches
          
          // Check if words appear in the same semantic group
          const matchingGroup = semanticGroups.find(group => 
            group.includes(playerWord.toLowerCase()) && group.includes(friendWord.toLowerCase())
          );
          
          if (matchingGroup) {
            similarPairs.push({
              playerWord, 
              friendWord,
              group: matchingGroup
            });
          }
        });
      });
      
      const exactMatchCount = exactMatches.length;
      const similarMatchCount = Math.min(3 - exactMatchCount, similarPairs.length); // Cap at remaining words
      const totalMatchScore = exactMatchCount + (similarMatchCount * 0.5); // Similar words count as half
      const matchPercentage = Math.round((totalMatchScore / 3) * 100);
      
      // Generate personalized analysis text
      const playerName = playerData.name;
      let analysisText = '';
      
      // Mention exact matches
      if (exactMatches.length > 0) {
        if (exactMatches.length === 1) {
          analysisText += `Both ${playerName} and their friend used the word "${exactMatches[0]}" to describe ${playerName}. This shows clear alignment in how this quality is perceived. `;
        } else if (exactMatches.length === 2) {
          analysisText += `There's strong agreement between ${playerName} and their friend, with both using the words "${exactMatches[0]}" and "${exactMatches[1]}" to describe ${playerName}. This suggests these traits are clearly visible to both ${playerName} themselves and to others. `;
        } else if (exactMatches.length === 3) {
          analysisText += `Remarkably, ${playerName} and their friend chose exactly the same three words! This shows exceptional alignment between self-perception and how others see ${playerName}. `;
        }
      }
      
      // Mention similar words
      if (similarPairs.length > 0 && similarMatchCount > 0) {
        analysisText += `There are interesting connections between their word choices. `;
        
        similarPairs.slice(0, similarMatchCount).forEach((pair, index) => {
          analysisText += `${playerName}'s word "${pair.playerWord}" and their friend's word "${pair.friendWord}" share similar meanings, suggesting alignment in perception though expressed differently. `;
        });
      }
      
      // Add insight about differences
      const playerUnique = playerData.words.filter(word => 
        !exactMatches.includes(word) && 
        !similarPairs.slice(0, similarMatchCount).some(pair => pair.playerWord === word)
      );
      
      const friendUnique = friendData.words.filter(word => 
        !exactMatches.includes(word) && 
        !similarPairs.slice(0, similarMatchCount).some(pair => pair.friendWord === word)
      );
      
      if (playerUnique.length > 0 && friendUnique.length > 0) {
        analysisText += `Interestingly, while ${playerName} identifies with "${playerUnique.join(', ')}", their friend sees qualities like "${friendUnique.join(', ')}". This difference reveals how we sometimes emphasize different aspects of ourselves than others notice. These contrasting perspectives offer valuable insights into both ${playerName}'s self-image and how they present to others. `;
      }
      
      // Add conclusion based on match percentage
      if (matchPercentage >= 85) {
        analysisText += `Overall, there's exceptional alignment between ${playerName}'s self-perception and how their friend sees them, suggesting strong self-awareness and consistent expression of their authentic personality.`;
      } else if (matchPercentage >= 65) {
        analysisText += `There's significant overlap between how ${playerName} sees themselves and how they're perceived by others, with some nuanced differences that add depth to their personality profile.`;
      } else if (matchPercentage >= 40) {
        analysisText += `While there's moderate alignment in perception, the differences highlight how we all contain multifaceted aspects that may be more visible either to ourselves or to others, but not both.`;
      } else if (matchPercentage >= 20) {
        analysisText += `The notable differences between self-perception and external perception suggest ${playerName} might present differently than they see themselves, or may have qualities their friend recognizes that ${playerName} hasn't fully acknowledged.`;
      } else {
        analysisText += `The significant contrast between ${playerName}'s self-description and their friend's perception creates an opportunity for deeper self-reflection and conversation about how we see ourselves versus how others experience us.`;
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
              {playerData.name === 'You' ? 'Your Words' : `${playerData.name}'s Words`}
            </h2>
            {playerData.words.map((word, index) => (
              <div key={`self-${index}`} className={`${styles.wordChip} ${styles.selfWord}`}>
                {word}
              </div>
            ))}
          </div>
          
          <div className={styles.wordColumn}>
            <h2 className={styles.wordHeader}>
              Friend's Words
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