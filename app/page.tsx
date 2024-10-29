'use client'

import { useState, useEffect, useRef } from 'react'
import { PlusIcon, HomeIcon, UsersIcon, CalendarIcon, MusicalNoteIcon, ClockIcon, TrashIcon, PencilIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'
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
    praise: [{
      title: '',
      artist: '',
      youtubeLink: '',
      isLoading: false,
      isDetailsVisible: false,
    }],
    worship: [{
      title: '',
      artist: '',
      youtubeLink: '',
      isLoading: false,
      isDetailsVisible: false,
    }],
    altarCall: [{
      title: '',
      artist: '',
      youtubeLink: '',
      isLoading: false,
      isDetailsVisible: false,
    }]
  })
  const [activeTab, setActiveTab] = useState('home')
  const [keyVocals, setKeyVocals] = useState(['Soprano', 'Alto', 'Tenor', 'Bass'])
  const [recordedData, setRecordedData] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false)

  const contentRef = useRef(null)

  const [debouncedSearch] = useState(() =>
    debounce(async (category: string, index: number, query: string) => {
      console.log('Debounced search triggered:', query); // Debug log
      
      if (!query.trim()) {
        updateSetListItem(category, index, 'suggestions', []);
        return;
      }

      const suggestions = await searchSpotifySuggestions(query);
      console.log('Got suggestions:', suggestions); // Debug log
      
      updateSetListItem(category, index, 'suggestions', suggestions);
    }, 300)
  );

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

  const addSetListItem = (category: 'praise' | 'worship' | 'altarCall') => {
    setSetList(prev => ({
      ...prev,
      [category]: [...prev[category], {
        title: '',
        artist: '',
        youtubeLink: '',
        isLoading: false,
        isDetailsVisible: false,
      }]
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
      debouncedSearch(category, index, value);
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

  return (
    <div className="h-screen bg-[#121212] text-white">
      {/* Main content - everything scrollable */}
      <main className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8">
          {/* Title Section - now part of scrollable content */}
          <div className="pt-12 pb-8">
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-green-500 mb-2">TechScript Generator</h1>
              <p className="text-xl text-gray-400">by Echo</p>
            </div>
            
            <div className="flex items-center space-x-2 mb-12">
              <ClockIcon className="h-6 w-6 text-green-500" />
              <div className="text-lg text-gray-300">
                {currentDateTime?.toLocaleDateString()} {currentDateTime?.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Rest of content */}
          <div className="pb-8">
            {/* Event Details */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Event Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {isOtherEvent ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setIsOtherEvent(false)}
                      className="h-10 w-10 bg-[#282828] hover:bg-green-500 hover:text-white transition-colors"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Enter Event Name"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="flex-1 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                ) : (
                  <Select onValueChange={handleEventTypeChange}>
                    <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
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
              <h3 className="text-2xl font-semibold mb-2">Programme Flow</h3>
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
                className="mt-2 bg-green-500 hover:bg-green-600 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Programme Item
              </Button>
            </section>

            {/* Sermon Information */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Sermon Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Sermon Title" className="bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors" />
                <Input placeholder="Sermon Verse" className="bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors" />
              </div>
            </section>

            {/* Dress Code */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Dress Code</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2">Primary Color</label>
                  <div className="flex items-center">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 p-1 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="ml-2 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Secondary Color</label>
                  <div className="flex items-center">
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 p-1 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="ml-2 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Color Generator</label>
                  <Button
                    onClick={() => {
                      setPrimaryColor(generateRandomColor())
                      setSecondaryColor(generateRandomColor())
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 transition-colors"
                  >
                    Generate Colors
                  </Button>
                </div>
              </div>
            </section>

            {/* Set List */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Set List</h2>
              {['praise', 'worship', 'altarCall'].map((category) => (
                <div key={category} className="mb-4">
                  <h3 className="text-xl font-semibold mb-2 capitalize">{category}</h3>
                  {setList[category].map((item, index) => (
                    <div key={index} className="mb-2">
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            placeholder="Song Title"
                            value={item.title}
                            onChange={(e) => {
                              updateSetListItem(category, index, 'title', e.target.value);
                              console.log('Input changed:', e.target.value); // Debug log
                            }}
                            className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                          />
                          {item.isLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin h-4 w-4 border-2 border-green-500 rounded-full border-t-transparent"></div>
                            </div>
                          )}
                          {item.suggestions && item.suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-[#282828] rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {item.suggestions.map((track) => (
                                <button
                                  key={track.id}
                                  onClick={() => selectSuggestion(category, index, track)}
                                  className="w-full px-4 py-2 text-left hover:bg-[#383838] flex items-center gap-2"
                                >
                                  {track.thumbnail && (
                                    <img 
                                      src={track.thumbnail} 
                                      alt={track.title}
                                      className="w-8 h-8 rounded"
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium">{track.title}</div>
                                    <div className="text-sm text-gray-400">{track.artist}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <Input
                          placeholder="Artist"
                          value={item.artist}
                          onChange={(e) => updateSetListItem(category, index, 'artist', e.target.value)}
                          className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                        />
                        <Input
                          placeholder="YouTube Link (optional)"
                          value={item.youtubeLink}
                          onChange={(e) => updateSetListItem(category, index, 'youtubeLink', e.target.value)}
                          className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                        />
                        {item.isDetailsVisible && item.thumbnail && (
                          <div className="flex items-center gap-2 mt-2">
                            <img 
                              src={item.thumbnail} 
                              alt={item.title} 
                              className="w-12 h-12 rounded"
                            />
                            {item.spotifyUrl && (
                              <a 
                                href={item.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-400"
                              >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => addSetListItem(category)}
                    className="mt-2 bg-green-500 hover:bg-green-600 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add {category}
                  </Button>
                </div>
              ))}
            </section>

            {/* Roles */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-6">Roles</h2>
              <div className="space-y-6">
                <div className="bg-[#181818] p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Sermon</h3>
                  <div className="space-y-4">
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Select Preacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="john">John Doe</SelectItem>
                        <SelectItem value="jane">Jane Smith</SelectItem>
                        <SelectItem value="mark">Mark Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
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
                <div className="bg-[#181818] p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Worship</h3>
                  <div className="space-y-4">
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Worship Leader" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="david">David Lee</SelectItem>
                        <SelectItem value="emma">Emma Clark</SelectItem>
                        <SelectItem value="frank">Frank Taylor</SelectItem>
                      </SelectContent>
                    </Select>
                    <div>
                      <h4 className="text-lg font-semibold mb-2">Key Vocals</h4>
                      <div className="space-y-2">
                        {keyVocals.map((vocal, index) => (
                          <Select key={index}>
                            <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
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
                        className="mt-2 bg-green-500 hover:bg-green-600 transition-colors"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Voice
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="bg-[#181818] p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Musicians</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Acoustic Guitar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guitarist1">Guitarist 1</SelectItem>
                        <SelectItem value="guitarist2">Guitarist 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Bass Guitar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bassist1">Bassist 1</SelectItem>
                        <SelectItem value="bassist2">Bassist 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Keyboard" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyboardist1">Keyboardist 1</SelectItem>
                        <SelectItem value="keyboardist2">Keyboardist 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Drums" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drummer1">Drummer 1</SelectItem>
                        <SelectItem value="drummer2">Drummer 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-[#181818] p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">Creatives</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Lighting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lighting1">Lighting Tech 1</SelectItem>
                        <SelectItem value="lighting2">Lighting Tech 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Visual Lyrics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual1">Visual Tech 1</SelectItem>
                        <SelectItem value="visual2">Visual Tech 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
                        <SelectValue placeholder="Prompter Lyrics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prompter1">Prompter 1</SelectItem>
                        <SelectItem value="prompter2">Prompter 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-full bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors">
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

            {/* Recorded Data (hidden from view) */}
            <div className="hidden">
              <pre>{recordedData}</pre>
            </div>
          </div>
        </div>
      </main>
      <div className="fixed bottom-4 right-4">
        <Button onClick={handleCreate} className="bg-green-500 hover:bg-green-600 transition-colors">
          Create
        </Button>
      </div>
      {generatedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Schedule Created</h3>
            <p>Your schedule is available at:</p>
            <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {generatedLink}
            </a>
            <Button onClick={() => setGeneratedLink(null)} className="mt-4 bg-green-500 hover:bg-green-600 transition-colors">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}