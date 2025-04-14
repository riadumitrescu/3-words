'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import supabase from '@/lib/supabase';

// Constants for Gemini API
const GEMINI_API_KEY = 'AIzaSyDiHvbx9fwNV9nS_mpB28GQQnf_3-Fymik';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{text: string, score: number} | null>(null);
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

  // Process the API response text to extract score and analysis
  const processApiResponse = (text: string) => {
    // Extract the reflection part (everything before "Score:")
    const scoreIndex = text.lastIndexOf('Score:');
    let analysisText = '';
    let scoreValue = 0;
      
    if (scoreIndex !== -1) {
      // Format the analysis text to be more concise and readable
      analysisText = text.substring(0, scoreIndex).trim();
      
      // Break long paragraphs into shorter ones for better readability
      analysisText = analysisText
        .replace(/\.\s+/g, '.\n\n') // Add line breaks after periods
        .replace(/\n\n\n+/g, '\n\n') // Remove excess line breaks
        .replace(/\n\n([^A-Z])/g, '\n\n$1'); // Ensure proper capitalization
      
      // Extract score from the text (looking for "Score: XX%" pattern)
      const scoreMatch = text.substring(scoreIndex).match(/Score:\s*(\d+)%?/i);
      if (scoreMatch && scoreMatch[1]) {
        scoreValue = parseInt(scoreMatch[1]);
      } else {
        // If pattern isn't found in expected format, try to find any number
        const numberMatch = text.substring(scoreIndex).match(/\d+/);
        if (numberMatch) {
          scoreValue = parseInt(numberMatch[0]);
        } else {
          scoreValue = calculateBasicScore();
        }
      }
    } else {
      // If "Score:" text not found, use the whole response as analysis
      // Format the text for better readability
      analysisText = text
        .replace(/\.\s+/g, '.\n\n') // Add line breaks after periods
        .replace(/\n\n\n+/g, '\n\n') // Remove excess line breaks
        .replace(/\n\n([^A-Z])/g, '\n\n$1'); // Ensure proper capitalization
      
      scoreValue = calculateBasicScore();
    }
    
    return { text: analysisText, score: scoreValue };
  };

  // Calculate a basic score based on direct word matches
  const calculateBasicScore = () => {
    if (!playerData) return 0;
    
    const matchCount = playerData.words.filter(word => 
      words.some(friendWord => 
        friendWord.toLowerCase() === word.toLowerCase()
      )
    ).length;
    
    return Math.round((matchCount / 3) * 100);
  };

  // Generate a fallback analysis without using the API
  const generateFallbackAnalysis = () => {
    if (!playerData) return { text: '', score: 0 };
    
    // Check for exact word matches and semantically similar words
    const exactMatches = playerData.words.filter(word => 
      words.some(friendWord => 
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
      words.forEach(friendWord => {
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
    const playerName = playerData.name || 'your friend';
    let analysisText = '';
    
    // Mention exact matches
    if (exactMatches.length > 0) {
      if (exactMatches.length === 1) {
        analysisText += `Both ${playerName} and ${friendName} used the word "${exactMatches[0]}" to describe ${playerName}. This shows clear alignment in how this quality is perceived. `;
      } else if (exactMatches.length === 2) {
        analysisText += `There's strong agreement between ${playerName} and ${friendName}, with both using the words "${exactMatches[0]}" and "${exactMatches[1]}" to describe ${playerName}. This suggests these traits are clearly visible to both ${playerName} themselves and to others. `;
      } else if (exactMatches.length === 3) {
        analysisText += `Remarkably, ${playerName} and ${friendName} chose exactly the same three words! This shows exceptional alignment between self-perception and how others see ${playerName}. `;
      }
    }
    
    // Mention similar words
    if (similarPairs.length > 0 && similarMatchCount > 0) {
      analysisText += `There are interesting connections between their word choices. `;
      
      similarPairs.slice(0, similarMatchCount).forEach((pair) => {
        analysisText += `${playerName}'s word "${pair.playerWord}" and ${friendName}'s word "${pair.friendWord}" share similar meanings, suggesting alignment in perception though expressed differently. `;
      });
    }
    
    // Add insight about differences
    const playerUnique = playerData.words.filter(word => 
      !exactMatches.includes(word) && 
      !similarPairs.slice(0, similarMatchCount).some(pair => pair.playerWord === word)
    );
    
    const friendUnique = words.filter(word => 
      !exactMatches.includes(word) && 
      !similarPairs.slice(0, similarMatchCount).some(pair => pair.friendWord === word)
    );
    
    if (playerUnique.length > 0 && friendUnique.length > 0) {
      analysisText += `Interestingly, while ${playerName} identifies with "${playerUnique.join(', ')}", ${friendName} sees qualities like "${friendUnique.join(', ')}". This difference reveals how we sometimes emphasize different aspects of ourselves than others notice. These contrasting perspectives offer valuable insights into both ${playerName}'s self-image and how they present to others. `;
    }
    
    // Add conclusion based on match percentage
    if (matchPercentage >= 85) {
      analysisText += `Overall, there's exceptional alignment between ${playerName}'s self-perception and how ${friendName} sees them, suggesting strong self-awareness and consistent expression of their authentic personality.`;
    } else if (matchPercentage >= 65) {
      analysisText += `There's significant overlap between how ${playerName} sees themselves and how they're perceived by ${friendName}, with some nuanced differences that add depth to their personality profile.`;
    } else if (matchPercentage >= 40) {
      analysisText += `While there's moderate alignment in perception, the differences highlight how we all contain multifaceted aspects that may be more visible either to ourselves or to others, but not both.`;
    } else if (matchPercentage >= 20) {
      analysisText += `The notable differences between self-perception and external perception suggest ${playerName} might present differently than they see themselves, or may have qualities ${friendName} recognizes that ${playerName} hasn't fully acknowledged.`;
    } else {
      analysisText += `The significant contrast between ${playerName}'s self-description and ${friendName}'s perception creates an opportunity for deeper self-reflection and conversation about how we see ourselves versus how others experience us.`;
    }
    
    return { text: analysisText, score: matchPercentage };
  };

  // Generate analysis using Gemini API
  const generateAnalysis = async () => {
    if (!playerData) return null;
    
    setAnalysisInProgress(true);
    try {
      console.log("🔄 Starting analysis process for:", playerData.name);
      
      // Send to Gemini API for analysis with updated prompt
      // Shorter prompt for better reliability
      const prompt = `
      A person named ${playerData.name} described themselves with these 3 words: [${playerData.words.join(', ')}].
      Their friend ${friendName} described them with these 3 words: [${words.join(', ')}].
      
      Please analyze these word sets with these specific considerations:
      
      1. EXACT MATCHES (highest weight): Identify any exact same words between the sets (exact spelling matches should be weighted very heavily, worth 33% each).
      
      2. SIMILAR MEANINGS (medium weight): Identify words that aren't identical but share similar meanings (e.g., "intelligent" and "smart", "kind" and "caring"). These should count as partial matches (worth about 15-20% each).
      
      3. DISTANT RELATIONSHIPS (low weight): Identify any subtle or distant semantic connections between non-matching words (worth only 5-10% each).
      
      4. COMPLETE MISMATCHES: Identify words with no relationship whatsoever (worth 0%).
      
      Analyze what these similarities and differences reveal about ${playerData.name}'s self-perception versus how others perceive them. What might explain any gaps? 
      
      Make your analysis thoughtful but concise (3-4 short paragraphs maximum).
      
      End with: "Score: X%" where X is the total percentage alignment based on the weighting system above.
      `;

      console.log('🔍 Sending request to Gemini API with prompt length:', prompt.length);
      
      try {
        // Try to use the server API route for best reliability
        console.log('🔄 Attempting to use server-side API route...');
        const serverResponse = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gemini-1.5-flash',
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        });
        
        console.log('📥 Server API route response status:', serverResponse.status);
        
        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          console.log('✅ Server API route response received');
          
          const serverText = serverData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log('📝 Server text received, length:', serverText.length);
          
          if (serverText) {
            return processApiResponse(serverText);
          }
        } else {
          console.log('❌ Server API route failed, trying direct API...');
        }
      } catch (serverError) {
        console.error('Server API route error:', serverError);
      }
      
      // Direct API call as fallback
      try {
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
        
        // Send the request to Gemini API
        console.log('📤 Sending direct fetch request to Gemini API...');
        const response = await fetch(
          `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
          }
        );
        
        console.log('📥 Gemini API response received. Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            return processApiResponse(text);
          }
        }
      } catch (directApiError) {
        console.error('Direct API error:', directApiError);
      }
      
      // Fall back to our simple analysis if everything fails
      return generateFallbackAnalysis();
    } catch (err) {
      console.error('❌ Error generating analysis:', err);
      return generateFallbackAnalysis();
    } finally {
      setAnalysisInProgress(false);
    }
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
      
      // First, generate the analysis
      console.log('🧠 Generating analysis before saving to Supabase...');
      const analysis = await generateAnalysis();
      
      if (analysis) {
        setAnalysisResult(analysis);
        console.log('✅ Analysis generated:', analysis);
      } else {
        console.warn('⚠️ Could not generate analysis, using fallback');
        const fallbackAnalysis = generateFallbackAnalysis();
        setAnalysisResult(fallbackAnalysis);
        console.log('✅ Fallback analysis generated:', fallbackAnalysis);
      }
      
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
          player_name: playerData?.name || '',
          friend_name: friendName,
          friend_words: words,
          match_score: analysisResult?.score || 0,
          analysis: analysisResult?.text || '',
          created_at: createdAt
        };
        
        // Save updated entries array
        localStorage.setItem(
          `allWords-${id}`, 
          JSON.stringify([newEntry, ...existingEntries])
        );
        
        console.log('✅ Successfully saved words to localStorage with analysis');
      } catch (localStorageError) {
        console.error('LocalStorage save error:', localStorageError);
      }
      
      // Try to save the data to Supabase
      try {
        console.log('Sending to Supabase with analysis data:', { 
          user_id: id, 
          friend_name: friendName, 
          match_score: analysisResult?.score 
        });
        
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
        
        // Attempt to insert the data - include match_score and analysis
        const { error } = await supabase
          .from('words')
          .insert([
            { 
              user_id: id, 
              player_name: playerData?.name || '', 
              friend_name: friendName, 
              friend_words: words,
              match_score: analysisResult?.score || 0,
              analysis: analysisResult?.text || ''
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
          console.log('✅ Successfully saved to Supabase with analysis data');
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
          {isSubmitting ? (analysisInProgress ? 'Analyzing...' : 'Submitting...') : 'Submit'}
        </button>
      </div>
    </main>
  );
} 