'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import supabase from '@/lib/supabase';

type PlayerData = {
  name: string;
  words: string[];
  createdAt: string;
};

type FriendData = {
  name?: string;
  words: string[];
  createdAt: string;
};

// This type represents entries in the words table
type WordEntry = {
  id: string; // UUID from Supabase
  user_id: string;
  friend_name: string;
  friend_words: string[];
  created_at: string;
  match_score: number; // Optional match score field
  analysis: string; // Optional analysis field
};

// API key hardcoded for public use - This is intentionally exposed for educational purposes
// In a production environment, you would use environment variables (.env.local) and server-side API calls
const GEMINI_API_KEY = 'AIzaSyDxvCyONeV1_BNVKiVBslJUAjO1Kon4Yq8';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export default function ResultsPage() {
  const { id } = useParams();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [pastEntries, setPastEntries] = useState<WordEntry[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedFriendName, setSelectedFriendName] = useState<string | null>(null);
  const [isLoadingFriendData, setIsLoadingFriendData] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Set mounted state to ensure we only run client-side code after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse query parameters to get friend name
  useEffect(() => {
    if (!mounted) return;
    
    // Get the friend parameter from the URL
    const url = new URL(window.location.href);
    const friendParam = url.searchParams.get('friend');
    
    if (friendParam) {
      setSelectedFriendName(decodeURIComponent(friendParam));
    }
  }, [mounted]);

  // Fetch specific friend data when selected
  useEffect(() => {
    if (!mounted || !selectedFriendName || typeof id !== 'string') return;
    
    const loadSelectedFriendData = async () => {
      setIsLoadingFriendData(true);
      
      try {
        console.log(`🔍 Loading data for friend: ${selectedFriendName}`);
        
        // Try to get from Supabase first
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', id)
          .eq('friend_name', selectedFriendName)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          console.log('✅ Found friend data in Supabase:', data);
          
          // Update friend data state
          setFriendData({
            name: data.friend_name,
            words: data.friend_words,
            createdAt: data.created_at
          });
          
          // If the entry has analysis and match_score, use them
          if (data.analysis) {
            setAnalysis(data.analysis);
          }
          
          if (data.match_score) {
            setScore(data.match_score.toString());
          }
          
          setLoading(false);
        } else {
          console.warn('⚠️ Friend data not found in Supabase:', error);
          
          // Try to find in localStorage as fallback
          const localEntriesString = localStorage.getItem(`allWords-${id}`);
          if (localEntriesString) {
            try {
              const localEntries = JSON.parse(localEntriesString);
              const matchingEntry = localEntries.find(
                (entry: any) => entry.friend_name === selectedFriendName
              );
              
              if (matchingEntry) {
                console.log('✅ Found friend data in localStorage:', matchingEntry);
                
                setFriendData({
                  name: matchingEntry.friend_name,
                  words: matchingEntry.friend_words,
                  createdAt: matchingEntry.created_at
                });
                
                if (matchingEntry.analysis) {
                  setAnalysis(matchingEntry.analysis);
                }
                
                if (matchingEntry.match_score) {
                  setScore(matchingEntry.match_score.toString());
                }
                
                setLoading(false);
              } else {
                console.error('❌ Friend not found in localStorage either');
                setError(`Could not find data for ${selectedFriendName}`);
              }
            } catch (parseError) {
              console.error('Error parsing localStorage entries:', parseError);
              setError('Error loading friend data');
            }
          } else {
            setError(`Could not find data for ${selectedFriendName}`);
          }
        }
      } catch (err) {
        console.error('Error loading selected friend data:', err);
        setError('Error loading friend data');
      } finally {
        setIsLoadingFriendData(false);
      }
    };
    
    loadSelectedFriendData();
  }, [id, selectedFriendName, mounted]);

  useEffect(() => {
    if (!mounted || typeof id !== 'string') return;
    
    // Fetch past entries from Supabase
    const fetchPastEntries = async () => {
      setLoadingEntries(true);
      try {
        console.log('Fetching words for user_id:', id);
        
        // First check if the table exists
        try {
          const { error: tableCheckError } = await supabase
            .from('words')
            .select('count')
            .limit(1);
          
          if (tableCheckError && tableCheckError.message.includes('does not exist')) {
            console.error('Words table does not exist:', tableCheckError.message);
            setPastEntries([]);
            setLoadingEntries(false);
            return;
          }
        } catch (checkError) {
          console.error('Error checking table:', checkError);
        }
        
        // Fetch the data
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', id)
          .not('friend_name', 'ilike', '%(Self)%') // Exclude self entries
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching words:', error.message);
          
          // Try from localStorage if Supabase fails
          const localEntriesString = localStorage.getItem(`allWords-${id}`);
          if (localEntriesString) {
            try {
              const localEntries = JSON.parse(localEntriesString);
              console.log('Using cached entries from localStorage:', localEntries.length);
              setPastEntries(localEntries);
            } catch (parseError) {
              console.error('Error parsing localStorage entries:', parseError);
              setPastEntries([]);
            }
          } else {
            setPastEntries([]);
          }
        } else if (data) {
          console.log('Words data from Supabase:', data);
          setPastEntries(data);
        } else {
          console.log('No words data returned from Supabase');
          setPastEntries([]);
        }
      } catch (supabaseError) {
        console.error('Supabase fetch error:', supabaseError);
        setPastEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };
    
    // Main function to get all data
    const loadAllData = async () => {
      // Skip loading player/friend data if we're loading a specific friend
      if (selectedFriendName) return;
      
      // Get player data from Supabase first, fall back to localStorage
      try {
        console.log('Fetching player data from Supabase for user_id:', id);
        const { data: playerRecord, error: playerError } = await supabase
          .from('words')
          .select('player_name, friend_words, created_at')
          .eq('user_id', id)
          .ilike('friend_name', '%(Self)%')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (playerRecord) {
          console.log('✅ Player data found in Supabase:', playerRecord);
          setPlayerData({
            name: playerRecord.player_name,
            words: playerRecord.friend_words,
            createdAt: playerRecord.created_at
          });
        } else {
          console.log('⚠️ Player data not found in Supabase or error occurred:', playerError?.message);
          // Fall back to localStorage
          loadPlayerDataFromLocalStorage();
        }
      } catch (supabaseError) {
        console.error('Error fetching player data from Supabase:', supabaseError);
        // Fall back to localStorage
        loadPlayerDataFromLocalStorage();
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
    };
    
    // Helper function to load player data from localStorage if Supabase fails
    const loadPlayerDataFromLocalStorage = () => {
      // Get player data from localStorage
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
    };
    
    // Always fetch past entries
    fetchPastEntries();
    
    // Only load player/friend data if not loading a specific friend
    if (!selectedFriendName) {
      loadAllData();
    }
  }, [id, mounted, selectedFriendName]);

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
        A person named ${playerData.name} described themselves with these 3 words: [${playerData.words.join(', ')}].
        Their friend ${friendData.name || 'a friend'} described them with these 3 words: [${friendData.words.join(', ')}].
        
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
          
          console.log('🌐 Using Gemini API endpoint:', GEMINI_ENDPOINT);
          console.log('🔑 Using API key (first 6 chars):', GEMINI_API_KEY.substring(0, 6) + '...');
          
          // Send the request to Gemini API
          console.log('📤 Sending fetch request to Gemini API...');
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
          console.log('📦 Response headers:', Object.fromEntries([...response.headers.entries()]));
          
          // Manual CORS testing
          console.log('🔍 Testing direct API access from client...');
          try {
            const testResponse = await fetch(
              `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: "Say hi" }] }]
                })
              }
            );
            console.log('✅ Direct API test status:', testResponse.status);
            const testData = await testResponse.json();
            console.log('✅ Direct API test response:', testData);
          } catch (testError) {
            console.error('❌ Direct API test failed:', testError);
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API response not OK (v1beta):', response.status, errorText);
            
            // Attempt alternative model if available
            console.log('🔄 Attempting fallback to alternative model...');
            const fallbackResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
              }
            );
            
            console.log('📥 Fallback response status:', fallbackResponse.status);
            
            if (!fallbackResponse.ok) {
              const fallbackErrorText = await fallbackResponse.text();
              console.error('❌ Fallback API response not OK:', fallbackResponse.status, fallbackErrorText);
              
              // Try the server-side API route as a final resort
              console.log('🔄 Attempting to use server-side API route...');
              try {
                const serverResponse = await fetch('/api/gemini', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: 'gemini-1.5-flash',
                    contents: requestPayload.contents
                  })
                });
                
                console.log('📥 Server API route response status:', serverResponse.status);
                
                if (serverResponse.ok) {
                  const serverData = await serverResponse.json();
                  console.log('✅ Server API route response received');
                  
                  const serverText = serverData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  console.log('📝 Server text received, length:', serverText.length);
                  
                  if (serverText) {
                    processApiResponse(serverText);
                    return;
                  }
                } else {
                  // Process error response from our server API route
                  try {
                    const errorData = await serverResponse.json();
                    console.error('❌ Server API route error response:', errorData);
                    
                    // Extract user-friendly message if available
                    if (errorData.userMessage) {
                      setError(errorData.userMessage);
                    } else if (errorData.error) {
                      setError(`AI Analysis Error: ${errorData.error}`);
                    } else {
                      setError(`AI Analysis Error (${serverResponse.status}): Please try again later.`);
                    }
                    
                    // Log the detailed error information for debugging
                    if (errorData.details) {
                      console.error('📋 Detailed error information:', errorData.details);
                    }
                    
                    // If server says we're rate limited, we might want to wait
                    if (serverResponse.status === 429 && errorData.details?.retryAfter) {
                      console.log(`⏱️ Rate limited. Retry after ${errorData.details.retryAfter} seconds`);
                    }
                    
                    generateFallbackAnalysis();
                    return;
                  } catch (parseError) {
                    console.error('❌ Could not parse server error response:', parseError);
                  }
                }
                
                // If server route also fails, try one more time with gemini-pro via server
                console.log('🔄 Final attempt: gemini-pro via server API route...');
                const finalResponse = await fetch('/api/gemini', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: 'gemini-pro',
                    contents: requestPayload.contents
                  })
                });
                
                if (finalResponse.ok) {
                  const finalData = await finalResponse.json();
                  const finalText = finalData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  
                  if (finalText) {
                    processApiResponse(finalText);
                    return;
                  }
                } else {
                  // Process error response from our final server API attempt
                  try {
                    const finalErrorData = await finalResponse.json();
                    console.error('❌ Final server API route error response:', finalErrorData);
                    
                    // Extract user-friendly message if available
                    if (finalErrorData.userMessage) {
                      setError(finalErrorData.userMessage);
                    } else if (finalErrorData.error) {
                      setError(`AI Analysis Error: ${finalErrorData.error}`);
                    }
                    
                    // Log the detailed error information for debugging
                    if (finalErrorData.details) {
                      console.error('📋 Detailed error information:', finalErrorData.details);
                    }
                  } catch (parseError) {
                    console.error('❌ Could not parse final server error response:', parseError);
                  }
                }
              } catch (serverError) {
                console.error('❌ Server API route error:', serverError);
                setError('Could not connect to AI service. Please check your internet connection and try again.');
              }
              
              console.log('🔄 All API attempts failed, using fallback analysis');
              generateFallbackAnalysis();
              return;
            }
            
            // Process fallback response
            const fallbackData = await fallbackResponse.json();
            console.log('✅ Fallback Gemini API response received');
            
            const fallbackText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            console.log('📝 Fallback text received, length:', fallbackText.length);
            
            if (fallbackText) {
              processApiResponse(fallbackText);
            } else {
              console.error('❌ No valid response from fallback API:', fallbackData);
              generateFallbackAnalysis();
            }
            return;
          }
          
          const data = await response.json();
          console.log('✅ Gemini API response successfully parsed');
          
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log('📝 Extracted text from API response:', text ? `${text.substring(0, 100)}... (length: ${text.length})` : 'None');
          
          if (text) {
            console.log('✅ Processing valid API response text');
            processApiResponse(text);
          } else if (data.error) {
            console.error('❌ Gemini API error:', data.error);
            generateFallbackAnalysis();
          } else {
            console.error('❌ No valid response from Gemini API:', data);
            generateFallbackAnalysis();
          }
        } catch (apiError) {
          console.error('❌ Error with API request:', apiError);
          generateFallbackAnalysis();
        }
      } catch (err) {
        console.error('❌ Error analyzing words:', err);
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
        // Format the analysis text to be more concise and readable
        let analysisText = text.substring(0, scoreIndex).trim();
        
        // Break long paragraphs into shorter ones for better readability
        analysisText = analysisText
          .replace(/\.\s+/g, '.\n\n') // Add line breaks after periods
          .replace(/\n\n\n+/g, '\n\n') // Remove excess line breaks
          .replace(/\n\n([^A-Z])/g, '\n\n$1'); // Ensure proper capitalization
        
        setAnalysis(analysisText);
        
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
        // Format the text for better readability
        const analysisText = text
          .replace(/\.\s+/g, '.\n\n') // Add line breaks after periods
          .replace(/\n\n\n+/g, '\n\n') // Remove excess line breaks
          .replace(/\n\n([^A-Z])/g, '\n\n$1'); // Ensure proper capitalization
        
        setAnalysis(analysisText);
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
            We couldn&apos;t find the necessary data. The link might be invalid or expired.
          </p>
          <Link href="/" className={styles.button}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // Handle click on a past reflection
  const handleReflectionClick = (friendName: string) => {
    if (typeof id === 'string') {
      const url = `/results/${id}?friend=${encodeURIComponent(friendName)}`;
      router.push(url);
    }
  };

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
              {friendData.name ? `${friendData.name}'s View` : `Friend's Words`}
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
              <span>
                {friendData.name ? friendData.name : 'This friend'} sees {playerData.name === 'You' ? 'you' : playerData.name}
              </span>
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
        
        {/* Past Reflections Section */}
        <div className={styles.pastReflectionsSection}>
          <h2 className={styles.pastReflectionsTitle}>What others said</h2>
          
          {loadingEntries ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading past reflections...</p>
            </div>
          ) : pastEntries.length > 0 ? (
            <div className={styles.reflectionsList}>
              {pastEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`${styles.reflectionCard} ${selectedFriendName === entry.friend_name ? styles.selectedReflection : ''}`}
                  onClick={() => handleReflectionClick(entry.friend_name)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${entry.friend_name}'s reflection`}
                >
                  <h3 className={styles.reflectionName}>
                    {entry.friend_name}
                    {entry.friend_name === playerData.name && " (Self)"}
                  </h3>
                  <div className={styles.reflectionWords}>
                    {entry.friend_words.map((word, idx) => (
                      <div key={idx} className={styles.reflectionWordChip}>
                        {word}
                      </div>
                    ))}
                  </div>
                  <div className={styles.reflectionScore}>
                    <span className={styles.scoreValue}>{entry.match_score}%</span>
                  </div>
                  <div className={styles.reflectionDate}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noReflections}>No past reflections yet.</p>
          )}
        </div>
        
        <div className={styles.actions}>
          <Link href="/" className={styles.button}>
            Try for yourself
          </Link>
        </div>
      </div>
    </main>
  );
} 