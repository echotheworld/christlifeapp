'use client'

import { useState, useEffect, useRef } from 'react'
import { PlusIcon, HomeIcon, UsersIcon, CalendarIcon, MusicalNoteIcon, ClockIcon, TrashIcon, PencilIcon, DocumentArrowDownIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import SpotifyWebApi from 'spotify-web-api-node';
import { supabase } from '@/lib/supabase'

type SpotifyCredentials = {
  clientId: string;
  clientSecret: string;
};

type MusicDetails = {
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  spotifyUrl?: string;
}

// Add these style constants at the top of the file
const STYLES = {
  input: "w-full bg-[#282828] border-none focus:ring-2 focus:ring-green-500 hover:bg-[#323232] transition-colors",
  select: "w-full bg-[#282828] border-none hover:bg-[#323232] focus:ring-2 focus:ring-green-500 transition-colors",
  button: {
    primary: "bg-green-500 hover:bg-green-600 text-white transition-colors font-medium",
    secondary: "bg-[#323232] hover:bg-[#404040] text-white transition-colors font-medium",
    danger: "bg-red-500 hover:bg-red-600 text-white transition-colors font-medium",
  },
  card: "bg-[#1E1E1E] rounded-lg p-6 border border-[#333333]",
  section: "mb-12", // Increased spacing between sections
  sectionTitle: "text-2xl font-bold mb-6 text-white",
  subsectionTitle: "text-xl font-semibold mb-4 text-white",
}

// Initialize Spotify API (outside component)
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET,
});

// Add this function to handle Spotify authentication
const authenticateSpotify = async () => {
  try {
    // Create auth token using client credentials
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID + ':' + 
          process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET
        ),
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    
    if (data.access_token) {
      spotifyApi.setAccessToken(data.access_token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error authenticating with Spotify:', error);
    return false;
  }
};

// Add this new function to search Spotify directly
const searchMusic = async (query: string): Promise<MusicDetails | null> => {
  try {
    // Authenticate if needed
    if (!spotifyApi.getAccessToken()) {
      const authenticated = await authenticateSpotify();
      if (!authenticated) return null;
    }

    // Search tracks
    const searchResult = await spotifyApi.searchTracks(query, { limit: 1 });

    if (searchResult.body.tracks?.items.length === 0) return null;

    const track = searchResult.body.tracks?.items[0];
    return {
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      thumbnail: track.album.images[0]?.url,
      spotifyUrl: track.external_urls.spotify
    };
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
};

// Add new types
type SpotifyTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail?: string;
  spotifyUrl: string;
}

type SetListItem = {
  title: string;
  artist: string;
  youtubeLink: string;
  spotifyId?: string;
  album?: string;
  thumbnail?: string;
  spotifyUrl?: string;
  suggestions?: SpotifyTrack[];
  isLoading: boolean;
  isDetailsVisible: boolean;
}

// Add debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Add function to search Spotify with suggestions
const searchSpotifySuggestions = async (query: string): Promise<SpotifyTrack[]> => {
  try {
    if (!query.trim()) return [];

    // Authenticate if needed
    if (!spotifyApi.getAccessToken()) {
      const authenticated = await authenticateSpotify();
      if (!authenticated) {
        console.error('Failed to authenticate with Spotify');
        return [];
      }
    }

    console.log('Searching for:', query); // Debug log

    const searchResult = await spotifyApi.searchTracks(query, { limit: 5 });
    
    console.log('Search results:', searchResult.body.tracks?.items); // Debug log

    return searchResult.body.tracks?.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      thumbnail: track.album.images[track.album.images.length - 1]?.url,
      spotifyUrl: track.external_urls.spotify
    })) || [];

  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
};

// Add this helper function at the top of your component
const lettersOnly = (str: string) => /^[A-Za-z\s]+$/.test(str);

// Define types
type Person = {
  id: string
  name: string
}

type Musician = Person & {
  instrument: string
}

type Creative = Person & {
  role: string
}

// Add this constant at the top of your file
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
];

export default function ServiceSchedule() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null)
  const [eventDate, setEventDate] = useState<Date>()
  const [eventName, setEventName] = useState('')
  const [isOtherEvent, setIsOtherEvent] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#00ff00')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [programmeFlow, setProgrammeFlow] = useState([
    { name: 'Countdown Begins', startTime: '08:55', endTime: '09:00' }
  ])
  const [setList, setSetList] = useState<Record<string, SetListItem[]>>({
    praise: [],
    worship: [],
    altarCall: [],
    revival: []
  })
  const [activeTab, setActiveTab] = useState('home')
  const [keyVocals, setKeyVocals] = useState(['Soprano', 'Alto', 'Tenor', 'Bass'])
  const [recordedData, setRecordedData] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false)

  const contentRef = useRef(null)

  // Add state for suggestions
  const [suggestions, setSuggestions] = useState<{
    praise: SpotifyTrack[];
    worship: SpotifyTrack[];
    altarCall: SpotifyTrack[];
    revival: SpotifyTrack[];
  }>({
    praise: [],
    worship: [],
    altarCall: [],
    revival: []
  });

  // Add loading state
  const [isLoading, setIsLoading] = useState<{
    praise: boolean;
    worship: boolean;
    altarCall: boolean;
    revival: boolean;
  }>({
    praise: false,
    worship: false,
    altarCall: false,
    revival: false
  });

  // Add state to track which dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Add useRef for the dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add useEffect for click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        // Clear all suggestions
        setSuggestions(prev => ({
          praise: [],
          worship: [],
          altarCall: [],
          revival: []
        }));
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const debouncedSearch = debounce(async (category: string, query: string) => {
    if (!query.trim()) {
      setSuggestions(prev => ({ ...prev, [category]: [] }));
      return;
    }

    setIsLoading(prev => ({ ...prev, [category]: true }));

    try {
      // Authenticate if needed
      if (!spotifyApi.getAccessToken()) {
        const authenticated = await authenticateSpotify();
        if (!authenticated) return;
      }

      const results = await spotifyApi.searchTracks(query, { limit: 5 });
      const tracks: SpotifyTrack[] = results.body.tracks?.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        thumbnail: track.album.images[0]?.url,
        spotifyUrl: track.external_urls.spotify
      })) || [];

      setSuggestions(prev => ({ ...prev, [category]: tracks }));
    } catch (error) {
      console.error('Error searching Spotify:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, [category]: false }));
    }
  }, 500);

  useEffect(() => {
    // Set initial time only after component mounts on client
    setCurrentDateTime(new Date())
    
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Record all data whenever it changes
    const data = JSON.stringify({
      eventName,
      eventDate,
      programmeFlow,
      setList,
      keyVocals,
      primaryColor,
      secondaryColor
    }, null, 2)
    setRecordedData(data)
  }, [eventName, eventDate, programmeFlow, setList, keyVocals, primaryColor, secondaryColor])

  // Update the state to have separate inputs for each category
  const [inputs, setInputs] = useState({
    praise: { title: '', artist: '', youtubeLink: '' },
    worship: { title: '', artist: '', youtubeLink: '' },
    altarCall: { title: '', artist: '', youtubeLink: '' },
    revival: { title: '', artist: '', youtubeLink: '' }
  });

  // Modify addSetListItem to use the current input
  const addSetListItem = (category: 'praise' | 'worship' | 'altarCall' | 'revival') => {
    if (!inputs[category].title.trim()) return;

    setSetList(prev => ({
      ...prev,
      [category]: [...prev[category], {
        title: inputs[category].title,
        artist: inputs[category].artist,
        youtubeLink: inputs[category].youtubeLink,
        isLoading: false,
        isDetailsVisible: false,
      }]
    }));

    // Clear the form after adding
    setInputs(prev => ({
      ...prev,
      [category]: { title: '', artist: '', youtubeLink: '' }
    }));
  };

  const updateSetListItem = (
    category: 'praise' | 'worship' | 'altarCall',
    index: number,
    field: keyof SetListItem,
    value: any
  ) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));

    // If updating title, trigger suggestions search
    if (field === 'title') {
      debouncedSearch(category, value);
    }
  };

  const deleteSetListItem = (category: 'praise' | 'worship' | 'altarCall', index: number) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }))
  }

  const addProgrammeItem = () => {
    setProgrammeFlow(prev => {
      const lastItem = prev[prev.length - 1];
      const newStartTime = lastItem ? lastItem.endTime : ''; // Get the end time of the last item
      
      return [...prev, {
        name: '',
        startTime: newStartTime, // Use the previous end time as the new start time
        endTime: ''
      }];
    });
  };

  const updateProgrammeItem = (index: number, field: 'name' | 'startTime' | 'endTime', value: string) => {
    setProgrammeFlow(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const deleteProgrammeItem = (index: number) => {
    setProgrammeFlow(prev => prev.filter((_, i) => i !== index))
  }

  const generateRandomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16)
  }

  const addKeyVocal = () => {
    setKeyVocals(prev => [...prev, `Voice ${prev.length + 1}`])
  }

  const exportToJPEG = async () => {
    if (contentRef.current) {
      const canvas = await html2canvas(contentRef.current)
      const dataURL = canvas.toDataURL('image/jpeg')
      const link = document.createElement('a')
      link.href = dataURL
      link.download = 'service_schedule.jpg'
      link.click()
    }
  }

  const exportToPDF = async () => {
    if (contentRef.current) {
      const canvas = await html2canvas(contentRef.current)
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [8.5, 11]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11)
      pdf.save('service_schedule.pdf')
    }
  }

  const handleCreate = () => {
    setShowSummary(true); // Show summary first instead of creating immediately
  };

  const handleEventTypeChange = (value: string) => {
    if (value === 'others') {
      setIsOtherEvent(true)
      setEventName('')
    } else {
      setIsOtherEvent(false)
      setEventName(value)
    }
  }

  // Update the checkYouTubeLink function to checkMusic
  const checkMusic = async (category: 'praise' | 'worship' | 'altarCall', index: number) => {
    const item = setList[category][index];
    
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, isLoading: true } : item
      )
    }));

    const details = await searchMusic(item.searchQuery);
    
    if (details) {
      setSetList(prev => ({
        ...prev,
        [category]: prev[category].map((item, i) =>
          i === index ? {
            ...item,
            title: details.title,
            by: details.artist,
            album: details.album,
            thumbnail: details.thumbnail,
            spotifyUrl: details.spotifyUrl,
            isDetailsVisible: true,
            isLoading: false
          } : item
        )
      }));
    } else {
      setSetList(prev => ({
        ...prev,
        [category]: prev[category].map((item, i) =>
          i === index ? { ...item, isLoading: false } : item
        )
      }));
    }
  };

  // Add function to select a suggestion
  const selectSuggestion = (category: 'praise' | 'worship' | 'altarCall', index: number, track: SpotifyTrack) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? {
          ...item,
          title: track.title,
          artist: track.artist,
          album: track.album,
          thumbnail: track.thumbnail,
          spotifyUrl: track.spotifyUrl,
          spotifyId: track.id,
          suggestions: [], // Clear suggestions
          isDetailsVisible: true
        } : item
      )
    }));
  };

  // Update the input form JSX for each category
  const renderCategoryInput = (category: 'praise' | 'worship' | 'altarCall' | 'revival') => (
    <div className={STYLES.card}>
      <h3 className={STYLES.subsectionTitle}>
        {category === 'praise' ? 'Praise' :
         category === 'worship' ? 'Worship' :
         category === 'altarCall' ? 'Altar Call' :
         'Revival'}
      </h3>
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Song Title"
            value={inputs[category].title}
            onChange={(e) => {
              setInputs(prev => ({
                ...prev,
                [category]: { ...prev[category], title: e.target.value }
              }));
              setOpenDropdown(category);
              debouncedSearch(category, e.target.value);
            }}
            onFocus={() => setOpenDropdown(category)}
            className={STYLES.input}
          />
          {/* Suggestions Dropdown */}
          {suggestions[category].length > 0 && openDropdown === category && (
            <div 
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-[#282828] rounded-lg shadow-lg max-h-60 overflow-auto border border-[#333333]"
            >
              {suggestions[category].map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-2 p-2 hover:bg-[#383838] cursor-pointer"
                  onClick={() => {
                    setInputs(prev => ({
                      ...prev,
                      [category]: {
                        title: track.title,
                        artist: track.artist,
                        youtubeLink: ''
                      }
                    }));
                    setOpenDropdown(null); // Close dropdown after selection
                    setSuggestions(prev => ({ ...prev, [category]: [] }));
                  }}
                >
                  {track.thumbnail && (
                    <img src={track.thumbnail} alt="" className="w-10 h-10 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-gray-400">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isLoading[category] && (
            <div className="absolute right-3 top-3">
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        <Input
          placeholder="Artist Name"
          value={inputs[category].artist}
          onChange={(e) => setInputs(prev => ({
            ...prev,
            [category]: { ...prev[category], artist: e.target.value }
          }))}
          className={STYLES.input}
        />
        <Input
          placeholder="YouTube Link"
          value={inputs[category].youtubeLink}
          onChange={(e) => setInputs(prev => ({
            ...prev,
            [category]: { ...prev[category], youtubeLink: e.target.value }
          }))}
          className={STYLES.input}
        />
        <Button
          onClick={() => addSetListItem(category)}
          className={`w-full ${STYLES.button.primary}`}
        >
          Add Song
        </Button>
      </div>
    </div>
  );

  const calculateTotalHours = (items: typeof programmeFlow) => {
    let totalMinutes = 0;
    
    items.forEach(item => {
      if (item.startTime && item.endTime) {
        const start = new Date(`1970-01-01T${item.startTime}`);
        const end = new Date(`1970-01-01T${item.endTime}`);
        totalMinutes += (end.getTime() - start.getTime()) / 1000 / 60;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };

  // Add state for all roles
  const [preachers, setPreachers] = useState<Person[]>([])
  const [preachingSupport, setPreachingSupport] = useState<Person[]>([])
  const [worshipLeaders, setWorshipLeaders] = useState<Person[]>([])
  const [vocalists, setVocalists] = useState<Person[]>([])
  const [musicians, setMusicians] = useState<Musician[]>([])
  const [creatives, setCreatives] = useState<Creative[]>([])

  // Add state for selections
  const [selectedPreacher, setSelectedPreacher] = useState<string>('')
  const [selectedSupport, setSelectedSupport] = useState<string>('')
  const [selectedWorshipLeader, setSelectedWorshipLeader] = useState<string>('')
  const [selectedVocalists, setSelectedVocalists] = useState<string[]>([])
  const [selectedMusicians, setSelectedMusicians] = useState<Record<string, string>>({})
  const [selectedCreatives, setSelectedCreatives] = useState<Record<string, string>>({})

  // Fetch all role data on component mount
  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        // Fetch preachers
        const { data: preachersData } = await supabase
          .from('preachers')
          .select('id, name')
          .order('id', { ascending: true })
        
        console.log('Fetched Preachers:', preachersData)
        setPreachers(preachersData || [])

        // Add fetch for preaching support
        const { data: supportData } = await supabase
          .from('preaching_support')  // Make sure this matches your table name
          .select('id, name')
          .order('id', { ascending: true })
        
        console.log('Fetched Support:', supportData)
        setPreachingSupport(supportData || [])

      } catch (error) {
        console.error('Error fetching role data:', error)
      }
    }

    fetchRoleData()
  }, [])

  // Update the Roles section JSX:
  const renderRolesSection = () => (
    <section className={STYLES.section}>
      <h2 className={STYLES.sectionTitle}>Roles</h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Sermon */}
        <div className={STYLES.card}>
          <h3 className={STYLES.subsectionTitle}>Sermon</h3>
          <div className="space-y-4">
            <Select value={selectedPreacher} onValueChange={setSelectedPreacher}>
              <SelectTrigger className={STYLES.select}>
                <SelectValue placeholder="Preacher" />
              </SelectTrigger>
              <SelectContent>
                {preachers.map((preacher) => (
                  <SelectItem 
                    key={preacher.id} 
                    value={preacher.id.toString()}
                    onClick={() => console.log('Selected:', preacher.name, preacher.id)}
                  >
                    {preacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSupport} onValueChange={setSelectedSupport}>
              <SelectTrigger className={STYLES.select}>
                <SelectValue placeholder="Preaching Support" />
              </SelectTrigger>
              <SelectContent>
                {preachingSupport.map((person) => (
                  <SelectItem 
                    key={person.id} 
                    value={person.id.toString()}
                    onClick={() => console.log('Selected Support:', person.name, person.id)}
                  >
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Worship */}
        <div className={STYLES.card}>
          <h3 className={STYLES.subsectionTitle}>Worship</h3>
          <div className="space-y-4">
            {/* Worship Leader - Keeping original sort by ID */}
            {(() => {
              // Get available worship leaders
              const availableLeaders = worshipLeaders.filter(leader => {
                // Check if this leader is selected as a vocalist
                const selectedAsVocalist = selectedVocalists.includes(leader.id.toString());
                // Check if this leader is not the currently selected worship leader
                const notCurrentLeader = selectedWorshipLeader !== leader.id.toString();
                
                return !selectedAsVocalist || !notCurrentLeader;
              });

              // If no leaders available and none selected, show disabled state
              if (availableLeaders.length === 0 && !selectedWorshipLeader) {
                return (
                  <div className="opacity-50">
                    <Select disabled>
                      <SelectTrigger className={`${STYLES.select} cursor-not-allowed`}>
                        <SelectValue placeholder="No Worship Leader available" />
                      </SelectTrigger>
                    </Select>
                  </div>
                );
              }

              return (
                <Select value={selectedWorshipLeader} onValueChange={setSelectedWorshipLeader}>
                  <SelectTrigger className={STYLES.select}>
                    <SelectValue placeholder="Worship Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeaders.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id.toString()}>
                        {leader.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}

            {/* Key Vocals - Now sorted by name */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Key Vocals</h4>
              <div className="space-y-2">
                {keyVocals.map((vocal, index) => {
                  // Get available vocalists for this position and sort by name
                  const availableVocalists = vocalists
                    .filter(vocalist => {
                      // Check if vocalist is already selected in another position
                      const selectedInOtherPosition = selectedVocalists
                        .filter((_, i) => i !== index)
                        .includes(vocalist.id.toString());
                      
                      // Check if vocalist is selected as worship leader
                      const selectedAsLeader = selectedWorshipLeader === vocalist.id.toString();

                      return !selectedInOtherPosition && !selectedAsLeader;
                    })
                    // Sort by name alphabetically
                    .sort((a, b) => a.name.localeCompare(b.name));

                  // If no vocalists available and none selected for this position, show disabled state
                  if (availableVocalists.length === 0 && !selectedVocalists[index]) {
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="opacity-50 flex-grow">
                          <Select disabled>
                            <SelectTrigger className={`${STYLES.select} cursor-not-allowed`}>
                              <SelectValue placeholder={`No vocalist available for ${vocal}`} />
                            </SelectTrigger>
                          </Select>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={selectedVocalists[index]}
                        onValueChange={(value) => {
                          const newSelected = [...selectedVocalists];
                          newSelected[index] = value;
                          setSelectedVocalists(newSelected);
                        }}
                      >
                        <SelectTrigger className={STYLES.select}>
                          <SelectValue placeholder={vocal} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVocalists.map((vocalist) => (
                            <SelectItem key={vocalist.id} value={vocalist.id.toString()}>
                              {vocalist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedVocalists[index] && (
                        <Button
                          onClick={() => clearKeyVocal(index)}
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-transparent"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                onClick={addKeyVocal}
                className={`mt-2 ${STYLES.button.primary}`}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Voice
              </Button>
            </div>
          </div>
        </div>

        {/* Musicians */}
        <div className={STYLES.card}>
          <h3 className={STYLES.subsectionTitle}>Musicians</h3>
          <div className="grid grid-cols-2 gap-4">
            {['Acoustic Guitar', 'Electric Guitar', 'Bass Guitar', 'Keyboard', 'Drums'].map((instrument) => {
              const availableMusicians = musicians.filter(m => {
                // 1. Check if musician plays this instrument
                const playsInstrument = m.instrument === instrument;
                
                // 2. Check if this musician (by name) is already selected for ANY OTHER instrument
                const musicianName = m.name;
                const isSelectedElsewhere = Object.entries(selectedMusicians).some(([otherInstrument, selectedId]) => {
                  // Find the musician name for the selected ID
                  const selectedMusician = musicians.find(m => m.id.toString() === selectedId);
                  return otherInstrument !== instrument && selectedMusician?.name === musicianName;
                });
                
                // Only show if they play this instrument AND they're not selected elsewhere
                return playsInstrument && !isSelectedElsewhere;
              });

              return (
                <div key={instrument} className="flex items-center gap-2">
                  <div className="flex-grow">
                    <Select
                      value={selectedMusicians[instrument] || ""}
                      onValueChange={(value) => {
                        setSelectedMusicians(prev => ({
                          ...prev,
                          [instrument]: value
                        }))
                      }}
                    >
                      <SelectTrigger className={STYLES.select}>
                        <SelectValue placeholder={instrument} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMusicians.length > 0 ? (
                          availableMusicians.map((musician) => (
                            <SelectItem key={musician.id} value={musician.id.toString()}>
                              {musician.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-available" disabled>
                            No available musicians
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedMusicians[instrument] && (
                    <Button
                      onClick={() => clearMusician(instrument)}
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-transparent flex-shrink-0"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Creatives */}
        <div className={STYLES.card}>
          <h3 className={STYLES.subsectionTitle}>Creatives</h3>
          <div className="grid grid-cols-2 gap-4">
            {['Lighting', 'Visual Lyrics', 'Prompter', 'Photography', 'Content Writer'].map((role) => {
              const availableCreatives = creatives.filter(c => {
                // 1. Check if creative has this role
                const hasRole = c.role === role;
                
                // 2. Check if this creative (by name) is already selected for ANY OTHER role
                const creativeName = c.name;
                const isSelectedElsewhere = Object.entries(selectedCreatives).some(([otherRole, selectedId]) => {
                  // Find the creative name for the selected ID
                  const selectedCreative = creatives.find(c => c.id.toString() === selectedId);
                  return otherRole !== role && selectedCreative?.name === creativeName;
                });
                
                // Only show if they have this role AND they're not selected elsewhere
                return hasRole && !isSelectedElsewhere;
              });

              return (
                <div key={role} className="flex items-center gap-2">
                  <div className="flex-grow">
                    <Select
                      value={selectedCreatives[role] || ""}
                      onValueChange={(value) => {
                        setSelectedCreatives(prev => ({
                          ...prev,
                          [role]: value
                        }))
                      }}
                    >
                      <SelectTrigger className={STYLES.select}>
                        <SelectValue placeholder={role} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCreatives.length > 0 ? (
                          availableCreatives.map((creative) => (
                            <SelectItem key={creative.id} value={creative.id.toString()}>
                              {creative.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-available" disabled>
                            No available creatives
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCreatives[role] && (
                    <Button
                      onClick={() => clearCreative(role)}
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-transparent flex-shrink-0"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  )

  // Add these new state variables
  const [sermonSeries, setSermonSeries] = useState('')
  const [sermonTitle, setSermonTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')
  const [book, setBook] = useState('')

  // Add this function to clear the selected vocalist
  const clearKeyVocal = (index: number) => {
    setSelectedVocalists(prev => {
      const newSelected = [...prev];
      newSelected[index] = ''; // Clear the selection
      return newSelected;
    });
  };

  // Add these states to your component
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(''); // New state for selected book
  const [filteredBooks, setFilteredBooks] = useState<string[]>([]);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Add this function to your component
  const handleBookSearch = (value: string) => {
    setBookSearch(value);
    
    if (value.trim() === '') {
      setFilteredBooks([]);
      return;
    }

    const filtered = BIBLE_BOOKS.filter(book =>
      book.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredBooks(filtered);
    setIsBookDropdownOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!event.target) return;
      
      const target = event.target as HTMLElement;
      if (!target.closest('.bible-book-search')) {
        setIsBookDropdownOpen(false);
        setFilteredBooks([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add new state for the summary modal
  const [showSummary, setShowSummary] = useState(false);

  // Add this helper function to format the event type display
  const getEventTypeDisplay = () => {
    if (isOtherEvent) return eventName;
    
    // Convert the value to display text
    switch (eventName) {
      case 'sunday-service':
        return 'Sunday Service';
      case 'sunday-special':
        return 'Sunday Special';
      case 'sunday-praise-party':
        return 'Sunday Praise Party';
      case 'wednesday-revival':
        return 'Wednesday Revival';
      case 'others':
        return 'Others';
      default:
        return 'Not set';
    }
  };

  // Add these new clear functions near your other state management functions
  const clearMusician = (instrument: string) => {
    setSelectedMusicians(prev => {
      const updated = { ...prev };
      delete updated[instrument];
      return updated;
    });
  };

  const clearCreative = (role: string) => {
    setSelectedCreatives(prev => {
      const updated = { ...prev };
      delete updated[role];
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200">
      <main className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Header */}
          <div className={STYLES.section}>
            <h1 className="text-4xl font-bold text-white mb-2">TechScript Generator</h1>
            <p className="text-lg text-gray-400">by Echo</p>
            <div className="flex items-center space-x-2 mt-6">
              <ClockIcon className="h-5 w-5 text-green-500" />
              <div className="text-gray-400">
                {currentDateTime?.toLocaleDateString()} {currentDateTime?.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Event Details</h2>
            <div className={STYLES.card}>
              <div className="grid grid-cols-2 gap-4">
                {isOtherEvent ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost"
                      onClick={() => setIsOtherEvent(false)}
                      className={STYLES.button.secondary}
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Enter Event Name"
                      value={eventName}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === '' || 
                          (lettersOnly(value) && value.length <= 20)
                        ) {
                          setEventName(value);
                        }
                      }}
                      maxLength={20} // Additional safety measure
                      className={STYLES.input}
                    />
                  </div>
                ) : (
                  <Select onValueChange={handleEventTypeChange}>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Select Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday-service">Sunday Service</SelectItem>
                      <SelectItem value="sunday-special">Sunday Special</SelectItem>
                      <SelectItem value="sunday-praise-party">Sunday Praise Party</SelectItem>
                      <SelectItem value="wednesday-revival">Wednesday Revival</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal bg-[#282828] border-none hover:bg-green-500 hover:text-white focus:border-green-500 transition-colors ${!eventDate && "text-muted-foreground"}`}
                    >
                      {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date)
                        setOpen(false) // Close the calendar after selection
                      }}
                      initialFocus
                      className="bg-[#282828] text-white border-green-500"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          {/* Programme Flow */}
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Programme Flow</h2>
            <div className={STYLES.card}>
              {programmeFlow.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input
                    placeholder="Enter Programme Name"
                    value={item.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value === '' || 
                        (lettersOnly(value) && value.length <= 20)
                      ) {
                        updateProgrammeItem(index, 'name', value);
                      }
                    }}
                    maxLength={20} // Additional safety measure
                    className="flex-grow bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                  />
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => updateProgrammeItem(index, 'startTime', e.target.value)}
                      className="w-24 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 text-green-500 transition-colors [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-time-picker-indicator]:hidden"
                    />
                    <span className="text-green-500">to</span>
                    <Input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => updateProgrammeItem(index, 'endTime', e.target.value)}
                      className="w-24 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 text-green-500 transition-colors [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-time-picker-indicator]:hidden"
                    />
                  </div>
                  <Button onClick={() => deleteProgrammeItem(index)} className="bg-red-500 hover:bg-red-600 transition-colors">
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={addProgrammeItem}
                className={STYLES.button.primary}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Programme Item
              </Button>

              {/* Add the total duration display */}
              <div className="flex justify-end mt-4 text-gray-400">
                Total Duration: {' '}
                <span className="text-green-500 ml-2">
                  {calculateTotalHours(programmeFlow).split('h')[0]} Hour & {' '}
                  {calculateTotalHours(programmeFlow).split('h')[1].replace('m', '')} Minutes
                </span>
              </div>
            </div>
          </section>

          {/* Dress Code */}
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Dress Code</h2>
            <div className={STYLES.card}>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block mb-2 text-gray-400">Primary Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 p-1 bg-transparent border-none cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className={STYLES.input}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-gray-400">Secondary Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 p-1 bg-transparent border-none cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className={STYLES.input}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-gray-400">Quick Generate</label>
                  <Button
                    onClick={() => {
                      setPrimaryColor(generateRandomColor())
                      setSecondaryColor(generateRandomColor())
                    }}
                    className={`w-full ${STYLES.button.primary}`}
                  >
                    Random Colors
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Sermon Series */}
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Sermon Series</h2>
            <div className={STYLES.card}>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block mb-2 text-gray-400">Series</label>
                    <Input
                      placeholder="Enter Series Name"
                      value={sermonSeries}
                      className={STYLES.input}
                      onChange={(e) => {
                        if (e.target.value === '' || lettersOnly(e.target.value)) {
                          setSermonSeries(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-2 text-gray-400">Title</label>
                    <Input
                      placeholder="Enter Sermon Title"
                      value={sermonTitle}
                      className={STYLES.input}
                      onChange={(e) => {
                        if (e.target.value === '' || lettersOnly(e.target.value)) {
                          setSermonTitle(e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-gray-400">Bible Verse</label>
                  <div className="flex gap-4">
                    <div className="relative flex-1 bible-book-search">
                      <Input
                        placeholder="Book"
                        value={bookSearch}
                        className={STYLES.input}
                        onChange={(e) => handleBookSearch(e.target.value)}
                        onFocus={() => setIsBookDropdownOpen(true)}
                      />
                      {isBookDropdownOpen && filteredBooks.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[#282828] rounded-lg shadow-lg max-h-60 overflow-auto border border-[#333333]">
                          {filteredBooks.map((book) => (
                            <div
                              key={book}
                              className="px-3 py-2 hover:bg-[#383838] cursor-pointer"
                              onClick={() => {
                                setSelectedBook(book);
                                setBookSearch(book);
                                setBook(book);
                                setIsBookDropdownOpen(false);
                                setFilteredBooks([]);
                              }}
                            >
                              {book}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="Chapter"
                      type="text"
                      value={chapter}
                      className={`${STYLES.input} w-24`}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d{0,3}$/.test(value)) {
                          setChapter(value);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                        if (e.target.value.length >= 3 && e.key !== 'Backspace' && e.key !== 'Delete') {
                          e.preventDefault();
                        }
                      }}
                    />
                    <Input
                      placeholder="Verse"
                      type="text"
                      value={verse}
                      className={`${STYLES.input} w-24`}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          (value === '' || /^[0-9-]+$/.test(value)) &&
                          (value.replace('-', '').length <= 5)
                        ) {
                          setVerse(value);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (!/[0-9-]/.test(e.key)) {
                          e.preventDefault();
                        }
                        const futureValue = e.currentTarget.value + e.key;
                        if (futureValue.replace('-', '').length > 5) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Set List */}
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Set List</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              {renderCategoryInput('praise')}
              {renderCategoryInput('worship')}
              {renderCategoryInput('altarCall')}
              {renderCategoryInput('revival')}
            </div>
            
            {/* Songs Table */}
            <div className={STYLES.card}>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Artist</th>
                    <th className="pb-2">YouTube</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(setList).every(arr => arr.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-400">
                        No songs added yet
                      </td>
                    </tr>
                  ) : (
                    Object.entries(setList).map(([category, items]) =>
                      items.length > 0 && items.map((item, index) => (
                        <tr key={`${category}-${index}`} className="border-t border-[#282828]">
                          <td className="py-2 capitalize">
                            {category === 'altarCall' ? 'Altar Call' : category}
                          </td>
                          <td className="py-2">{item.title}</td>
                          <td className="py-2">{item.artist}</td>
                          <td className="py-2">
                            {item.youtubeLink && (
                              <a href={item.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400">
                                View
                              </a>
                            )}
                          </td>
                          <td className="py-2">
                            <Button
                              onClick={() => deleteSetListItem(category as keyof typeof setList, index)}
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-transparent"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Roles */}
          {renderRolesSection()}
        </div>
      </main>

      {/* Create Button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          onClick={handleCreate} 
          className={`${STYLES.button.primary} px-8 py-6 text-lg shadow-lg`}
        >
          Create
        </Button>
      </div>

      {/* Modal */}
      {generatedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className={`${STYLES.card} max-w-md w-full mx-4`}>
            <h3 className={STYLES.subsectionTitle}>Schedule Created</h3>
            <p className="mb-4">Your schedule is available at:</p>
            <a 
              href={generatedLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-500 hover:text-green-400 break-all"
            >
              {generatedLink}
            </a>
            <Button 
              onClick={() => setGeneratedLink(null)} 
              className={`${STYLES.button.primary} mt-6 w-full`}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Summary</h3>
            
            {/* Event Details in a more compact layout */}
            <div className="space-y-6">
              {/* Basic Info - 2 columns */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#282828] rounded-lg">
                <div>
                  <span className="text-gray-400">Event Type:</span>
                  <p className="font-medium">{getEventTypeDisplay()}</p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="font-medium">{eventDate ? format(eventDate, "PPP") : "Not set"}</p>
                </div>
              </div>

              {/* Programme Flow - Compact table */}
              <div className="p-4 bg-[#282828] rounded-lg">
                <h4 className="text-lg font-semibold text-green-500 mb-2">Programme Flow</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {programmeFlow.map((item, index) => (
                        <tr key={index} className="border-b border-[#333333] last:border-0">
                          <td className="py-1 pr-4">{item.name}</td>
                          <td className="py-1 text-right text-gray-400">
                            {item.startTime} - {item.endTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dress Code - Inline display */}
              <div className="p-4 bg-[#282828] rounded-lg">
                <h4 className="text-lg font-semibold text-green-500 mb-2">Dress Code</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }}></div>
                    <span className="text-sm">Primary: {primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: secondaryColor }}></div>
                    <span className="text-sm">Secondary: {secondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Sermon Details - Compact grid */}
              <div className="p-4 bg-[#282828] rounded-lg">
                <h4 className="text-lg font-semibold text-green-500 mb-2">Sermon Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Series:</span>
                    <p>{sermonSeries || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Title:</span>
                    <p>{sermonTitle || "Not set"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Bible Verse:</span>
                    <p>{book} {chapter}:{verse}</p>
                  </div>
                </div>
              </div>

              {/* Team - Compact columns */}
              <div className="p-4 bg-[#282828] rounded-lg">
                <h4 className="text-lg font-semibold text-green-500 mb-2">Team</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* Preaching */}
                  <div>
                    <h5 className="font-medium mb-1">Preaching</h5>
                    <div className="space-y-1">
                      <div>
                        <span className="text-gray-400">Preacher: </span>
                        <span>
                          {console.log('Selected Preacher ID:', selectedPreacher)}
                          {console.log('All Preachers:', preachers)}
                          {selectedPreacher ? 
                            preachers.find(p => {
                              console.log('Comparing:', p.id.toString(), selectedPreacher);
                              return p.id.toString() === selectedPreacher;
                            })?.name || 'Not found' 
                            : 'Not selected'
                          }
                        </span>
                      </div>
                      <p>
                        <span className="text-gray-400">Support: </span>
                        {console.log('Selected Support ID:', selectedSupport)}
                        {console.log('Preaching Support Data:', preachingSupport)}
                        {preachingSupport.find(p => p.id.toString() === selectedSupport)?.name || 'Not selected'}
                      </p>
                    </div>
                  </div>

                  {/* Worship */}
                  <div>
                    <h5 className="font-medium mb-1">Worship</h5>
                    <div className="space-y-1">
                      <p><span className="text-gray-400">Leader:</span> {worshipLeaders.find(w => w.id.toString() === selectedWorshipLeader)?.name || 'Not selected'}</p>
                      {selectedVocalists.map((id, index) => id && (
                        <p key={index}><span className="text-gray-400">Voice {index + 1}:</span> {vocalists.find(v => v.id.toString() === id)?.name}</p>
                      ))}
                    </div>
                  </div>

                  {/* Musicians & Creatives */}
                  <div>
                    <h5 className="font-medium mb-1">Musicians & Creatives</h5>
                    <div className="space-y-1">
                      {Object.entries(selectedMusicians).map(([instrument, id]) => id && (
                        <p key={instrument}><span className="text-gray-400">{instrument}:</span> {musicians.find(m => m.id.toString() === id)?.name}</p>
                      ))}
                      {Object.entries(selectedCreatives).map(([role, id]) => id && (
                        <p key={role}><span className="text-gray-400">{role}:</span> {creatives.find(c => c.id.toString() === id)?.name}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <Button 
                onClick={() => setShowSummary(false)} 
                className={STYLES.button.secondary}
              >
                Edit
              </Button>
              <Button 
                onClick={() => {
                  setShowSummary(false);
                  // Add your create logic here
                }} 
                className={`${STYLES.button.primary} flex-1`}
              >
                Confirm & Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}