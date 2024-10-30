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

export default function ServiceSchedule() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null)
  const [eventDate, setEventDate] = useState<Date>()
  const [eventName, setEventName] = useState('')
  const [isOtherEvent, setIsOtherEvent] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#00ff00')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [programmeFlow, setProgrammeFlow] = useState([
    { name: 'Opening Prayer', startTime: '09:00', endTime: '09:15' }
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
    setProgrammeFlow(prev => [...prev, { name: '', startTime: '', endTime: '' }])
  }

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
    // Generate a unique ID for the schedule
    const scheduleId = Math.random().toString(36).substr(2, 9);
    // In a real application, you would save the schedule data to a database here
    // For this example, we'll just generate a dummy link
    setGeneratedLink(`https://yourapp.com/view/${scheduleId}`);
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
        {category === 'altarCall' ? 'Altar Call' : category}
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
                      onChange={(e) => setEventName(e.target.value)}
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
                    placeholder="Programme Name"
                    value={item.name}
                    onChange={(e) => updateProgrammeItem(index, 'name', e.target.value)}
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
                <div>
                  <label className="block mb-2 text-gray-400">Series</label>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Select Series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faith">Faith Foundations</SelectItem>
                      <SelectItem value="love">Love in Action</SelectItem>
                      <SelectItem value="hope">Hope Renewed</SelectItem>
                      <SelectItem value="new">Start New Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-2 text-gray-400">Title</label>
                  <Input
                    placeholder="Enter sermon title"
                    className={STYLES.input}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-gray-400">Bible Verse</label>
                  <div className="flex gap-4">
                    <Select>
                      <SelectTrigger className={STYLES.select}>
                        <SelectValue placeholder="Book" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="genesis">Genesis</SelectItem>
                        <SelectItem value="exodus">Exodus</SelectItem>
                        {/* Add more books as needed */}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Chapter"
                      type="number"
                      min="1"
                      className={`${STYLES.input} w-24`}
                    />
                    <Input
                      placeholder="Verse"
                      type="text"
                      className={`${STYLES.input} w-24`}
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
                                Link
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
          <section className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Roles</h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Sermon */}
              <div className={STYLES.card}>
                <h3 className={STYLES.subsectionTitle}>Sermon</h3>
                <div className="space-y-4">
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Select Preacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="john">John Doe</SelectItem>
                      <SelectItem value="jane">Jane Smith</SelectItem>
                      <SelectItem value="mark">Mark Johnson</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Preaching Support" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alice">Alice Brown</SelectItem>
                      <SelectItem value="bob">Bob Wilson</SelectItem>
                      <SelectItem value="carol">Carol White</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Worship */}
              <div className={STYLES.card}>
                <h3 className={STYLES.subsectionTitle}>Worship</h3>
                <div className="space-y-4">
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Worship Leader" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="david">David Lee</SelectItem>
                      <SelectItem value="emma">Emma Clark</SelectItem>
                      <SelectItem value="frank">Frank Taylor</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Key Vocals</h4>
                    <div className="space-y-2">
                      {keyVocals.map((vocal, index) => (
                        <Select key={index}>
                          <SelectTrigger className={STYLES.select}>
                            <SelectValue placeholder={vocal} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="singer1">Singer 1</SelectItem>
                            <SelectItem value="singer2">Singer 2</SelectItem>
                            <SelectItem value="singer3">Singer 3</SelectItem>
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                    <Button
                      onClick={addKeyVocal}
                      className={`mt-2 ${STYLES.button.primary}`}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Singer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Musicians */}
              <div className={STYLES.card}>
                <h3 className={STYLES.subsectionTitle}>Musicians</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Acoustic Guitar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guitarist1">Guitarist 1</SelectItem>
                      <SelectItem value="guitarist2">Guitarist 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Bass Guitar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bassist1">Bassist 1</SelectItem>
                      <SelectItem value="bassist2">Bassist 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Keyboard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyboardist1">Keyboardist 1</SelectItem>
                      <SelectItem value="keyboardist2">Keyboardist 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Drums" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drummer1">Drummer 1</SelectItem>
                      <SelectItem value="drummer2">Drummer 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Creatives */}
              <div className={STYLES.card}>
                <h3 className={STYLES.subsectionTitle}>Creatives</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Lighting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lighting1">Lighting Tech 1</SelectItem>
                      <SelectItem value="lighting2">Lighting Tech 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Visual Lyrics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual1">Visual Tech 1</SelectItem>
                      <SelectItem value="visual2">Visual Tech 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Prompter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompter1">Prompter 1</SelectItem>
                      <SelectItem value="prompter2">Prompter 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className={STYLES.select}>
                      <SelectValue placeholder="Photography" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photographer1">Photographer 1</SelectItem>
                      <SelectItem value="photographer2">Photographer 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>
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
    </div>
  )
}