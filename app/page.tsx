'use client'

import { useState, useEffect, useRef } from 'react'
import { PlusIcon, ClockIcon, TrashIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import html2canvas from 'html2canvas'
import SpotifyWebApi from 'spotify-web-api-node'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GripVertical } from 'lucide-react'; // For burger/grip icon
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';


type SpotifyTrack = {
  id: string
  title: string
  artist: string
  album: string
  thumbnail?: string
  spotifyUrl: string
}

type SetListItem = {
  title: string
  artist: string
  youtubeLink: string
  spotifyId?: string
  album?: string
  thumbnail?: string
  spotifyUrl?: string
  suggestions?: SpotifyTrack[]
  isLoading: boolean
  isDetailsVisible: boolean
  searchQuery?: string
}

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

type ProgrammeItem = {
  name: string
  startTime: string
  endTime: string
}

type CategoryInputs = {
  title: string
  artist: string
  youtubeLink: string
}

// Move this type definition before the component and other state declarations
type SetListCategories = 'praise' | 'worship' | 'altarCall' | 'revival' | '';

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET,
})

// Constants
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
]

// Helper functions
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const formattedHour = hour % 12 || 12
  return `${formattedHour}:${minutes} ${ampm}`
}

const lettersOnly = (str: string) => /^[A-Za-z\s]+$/.test(str)


// Styles
const STYLES = {
  input: "w-full bg-[#282828] border-none focus:ring-2 focus:ring-green-500 hover:bg-[#323232] transition-colors",
  select: "w-full bg-[#282828] border-none hover:bg-[#323232] focus:ring-2 focus:ring-green-500 transition-colors",
  button: {
    primary: "bg-green-500 hover:bg-green-600 text-white transition-colors font-medium",
    secondary: "bg-[#323232] hover:bg-[#404040] text-white transition-colors font-medium",
    danger: "bg-red-500 hover:bg-red-600 text-white transition-colors font-medium",
  },
  card: "bg-[#1E1E1E] rounded-lg p-4 md:p-6 border border-[#333333]",
  section: "mb-8 md:mb-12",
  sectionTitle: "text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white",
  subsectionTitle: "text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white",
  summary: {
    container: "bg-[#1E1E1E] rounded-lg p-3 md:p-4 w-[95vw] md:max-w-3xl max-h-[85vh] overflow-y-auto font-mono text-sm",
    section: "p-4 bg-[#282828] rounded-lg mb-4",
    sectionTitle: "text-base font-semibold text-green-500 mb-3",
    label: "text-white inline-block w-40",
    value: "text-gray-400 flex-1",
    row: "mb-1.5 flex items-center",
    teamGrid: {
      container: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4",
      section: "space-y-1.5",
      title: "text-green-500 mb-1.5",
    },
    setList: {
      section: "mb-3 last:mb-0",
      category: "text-green-500 mb-1.5",
      row: "mb-1.5 flex items-center",
      label: "text-white inline-block w-[20rem]",
      value: "text-gray-400 flex-1",
    }
  }
}

// Add this type definition near your other types at the top of the file
type Database = {
  public: {
    Tables: {
      preachers: {
        Row: {
          id: string
          name: string
        }
      }
      preaching_support: {
        Row: {
          id: string
          name: string
        }
      }
      worship_leaders: {
        Row: {
          id: string
          name: string
        }
      }
      vocalists: {
        Row: {
          id: string
          name: string
        }
      }
      musicians: {
        Row: {
          id: string
          name: string
          instrument: string
        }
      }
      creatives: {
        Row: {
          id: string
          name: string
          role: string
        }
      }
    }
  }
}

// Add this interface near your other type definitions at the top of the file
interface SpotifyApiTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  external_urls: {
    spotify: string;
  };
}


// Main component
export default function ServiceSchedule(): JSX.Element {
  // State
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null)
  const [eventDate, setEventDate] = useState<Date>()
  const [eventName, setEventName] = useState('')
  const [isOtherEvent, setIsOtherEvent] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#00ff00')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [programmeFlow, setProgrammeFlow] = useState<ProgrammeItem[]>([
    { name: '', startTime: '', endTime: '' }
  ])
  const [setList, setSetList] = useState<Record<SetListCategories, SetListItem[]>>({
    "": [],
    praise: [],
    worship: [],
    altarCall: [],
    revival: []
  })
  const [keyVocals, setKeyVocals] = useState(['Soprano', 'Alto', 'Tenor', 'Bass'])
  const [showSummary, setShowSummary] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [open, setOpen] = useState(false)
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [_openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<SetListCategories, CategoryInputs>>({
    '': { title: '', artist: '', youtubeLink: '' },
    praise: { title: '', artist: '', youtubeLink: '' },
    worship: { title: '', artist: '', youtubeLink: '' },
    altarCall: { title: '', artist: '', youtubeLink: '' },
    revival: { title: '', artist: '', youtubeLink: '' }
  })
  const [preachers, setPreachers] = useState<Person[]>([])
  const [preachingSupport, setPreachingSupport] = useState<Person[]>([])
  const [worshipLeaders, setWorshipLeaders] = useState<Person[]>([])
  const [vocalists, setVocalists] = useState<Person[]>([])
  const [musicians, setMusicians] = useState<Musician[]>([])
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [selectedPreacher, setSelectedPreacher] = useState('')
  const [selectedSupport, setSelectedSupport] = useState('')
  const [selectedWorshipLeader, setSelectedWorshipLeader] = useState('')
  const [selectedVocalists, setSelectedVocalists] = useState<string[]>([])
  const [selectedMusicians, setSelectedMusicians] = useState<Record<string, string>>({})
  const [selectedCreatives, setSelectedCreatives] = useState<Record<string, string>>({})
  const [sermonSeries, setSermonSeries] = useState('')
  const [sermonTitle, setSermonTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')
  const [book, setBook] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [filteredBooks, setFilteredBooks] = useState<string[]>([])
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('');
  const [currentCategory, setCurrentCategory] = useState<SetListCategories>('');
  const [songSearch, setSongSearch] = useState('');
  const [showSpotifyResults, setShowSpotifyResults] = useState(false);
  const [generatedDateTime, setGeneratedDateTime] = useState<Date | null>(null)

  // Refs
  const summaryRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Effects
  useEffect(() => {
    setCurrentDateTime(new Date())
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        const { data: preachersData, error: preachersError } = await supabase
          .from('preachers')
          .select('id, name')
          .returns<Database['public']['Tables']['preachers']['Row'][]>()
        
        if (preachersError) throw preachersError
        setPreachers(preachersData || [])

        const { data: supportData, error: supportError } = await supabase
          .from('preaching_support')
          .select('id, name')
          .returns<Database['public']['Tables']['preaching_support']['Row'][]>()
        
        if (supportError) throw supportError
        setPreachingSupport(supportData || [])

        const { data: worshipData, error: worshipError } = await supabase
          .from('worship_leaders')
          .select('id, name')
          .returns<Database['public']['Tables']['worship_leaders']['Row'][]>()
        
        if (worshipError) throw worshipError
        setWorshipLeaders(worshipData || [])

        const { data: vocalistsData, error: vocalistsError } = await supabase
          .from('vocalists')
          .select('id, name')
          .returns<Database['public']['Tables']['vocalists']['Row'][]>()
        
        if (vocalistsError) throw vocalistsError
        setVocalists(vocalistsData || [])

        const { data: musiciansData, error: musiciansError } = await supabase
          .from('musicians')
          .select('id, name, instrument')
          .returns<Database['public']['Tables']['musicians']['Row'][]>()
        
        if (musiciansError) throw musiciansError
        setMusicians(musiciansData || [])

        const { data: creativesData, error: creativesError } = await supabase
          .from('creatives')
          .select('id, name, role')
          .returns<Database['public']['Tables']['creatives']['Row'][]>()
        
        if (creativesError) throw creativesError
        setCreatives(creativesData || [])
      } catch (error) {
        console.error('Error fetching role data:', error instanceof Error ? error.message : String(error))
      }
    }

    fetchRoleData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
        setSpotifyResults([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setOpenDropdown])

  // Spotify authentication
  const authenticateSpotify = async () => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(
            `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET}`
          ),
        },
        body: 'grant_type=client_credentials'
      })

      const data = await response.json()
      
      if (data.access_token) {
        spotifyApi.setAccessToken(data.access_token)
        return true
      }
      return false
    } catch (error) {
      console.error('Error authenticating with Spotify:', error)
      return false
    }
  }

  // Event handlers
  const handleEventTypeChange = (value: string) => {
    if (value === 'others') {
      setIsOtherEvent(true)
      setEventName('')
    } else {
      setIsOtherEvent(false)
      setEventName(value)
    }
  }

  const handleCreate = () => {
    setGeneratedDateTime(new Date())
    setShowSummary(true)
  }

  const handleBookSearch = (value: string): void => {
    setBookSearch(value)
    
    if (value.trim() === '') {
      setFilteredBooks([])
      return
    }

    const filtered = BIBLE_BOOKS.filter(book =>
      book.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredBooks(filtered)
    setIsBookDropdownOpen(true)
  }


  const addProgrammeItem = () => {
    setProgrammeFlow(prev => {
      const lastItem = prev[prev.length - 1]
      return [...prev, {
        name: '',
        startTime: lastItem ? lastItem.endTime : '',
        endTime: ''
      
      }]
    })
  }

  const updateProgrammeItem = (index: number, field: keyof ProgrammeItem, value: string) => {
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

  const clearKeyVocal = (index: number) => {
    setSelectedVocalists(prev => {
      const newSelected = [...prev]
      newSelected[index] = ''
      return newSelected
    })
  }

  const clearMusician = (instrument: string) => {
    setSelectedMusicians(prev => {
      const updated = { ...prev }
      delete updated[instrument]
      return updated
    })
  }

  const clearCreative = (role: string) => {
    setSelectedCreatives(prev => {
      const updated = { ...prev }
      delete updated[role]
      return updated
    })
  }

  // Copy to clipboard
  const copyToClipboard = async (ref: React.RefObject<HTMLElement>) => {
    if (!ref.current) return;
    
    try {
      // Create a wrapper div for capture
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';  // Move off-screen
      wrapper.style.width = '640px';    // Fixed width for consistency
      wrapper.style.backgroundColor = '#1E1E1E';
      
      // Clone the content
      const clone = ref.current.cloneNode(true) as HTMLElement;
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.width = '100%';
      
      // Add clone to wrapper
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Capture the clone
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#1E1E1E',
        scale: window.devicePixelRatio * 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 640,
        windowWidth: 640
      });

      // Clean up
      document.body.removeChild(wrapper);

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            if ('ClipboardItem' in window) {
              const clipboardItem = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([clipboardItem]);
              setNotificationMessage('Copied to clipboard successfully!');
              setShowNotification(true);
              setTimeout(() => {
                setShowNotification(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  window.location.reload();
                }, 500); // Small delay after scrolling before reload
              }, 3000);
            } else {
              setNotificationMessage('Clipboard feature not supported on this device');
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
            }
          } catch (error) {
            console.error('Clipboard error:', error);
            setNotificationMessage('Failed to copy to clipboard');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 3000);
          }
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error capturing image:', error);
      setNotificationMessage('Failed to capture image');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  // Helper functions
  const calculateTotalHours = (items: ProgrammeItem[]) => {
    let totalMinutes = 0
    
    items.forEach(item => {
      if (item.startTime && item.endTime) {
        const start = new Date(`1970-01-01T${item.startTime}`)
        const end = new Date(`1970-01-01T${item.endTime}`)
        totalMinutes += (end.getTime() - start.getTime()) / 1000 / 60
      }
    })

    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    
    return `${hours}h ${minutes}m`
  }

  const getEventTypeDisplay = () => {
    if (isOtherEvent) return eventName
    
    switch (eventName) {
      case 'sunday-service':
        return 'Sunday Service'
      case 'sunday-special':
        return 'Sunday Special'
      case 'sunday-praise-party':
        return 'Sunday Praise Party'
      case 'wednesday-revival':
        return 'Wednesday Revival'
      case 'others':
        return 'Others'
      default:
        return 'Not set'
    }
  }

  const handleDeleteSong = (category: keyof typeof setList, index: number) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }))
  }

  // Add this function in your component
  const handleAddSong = (category: SetListCategories) => {
    if (!inputs[category].title || !inputs[category].artist) return;

    setSetList(prev => ({
      ...prev,
      [category]: [...prev[category], {
        title: inputs[category].title,
        artist: inputs[category].artist,
        youtubeLink: inputs[category].youtubeLink,
        isLoading: false,
        isDetailsVisible: false
      }]
    }));

    // Clear inputs after adding
    setInputs(prev => ({
      ...prev,
      [category]: {
        title: '',
        artist: '',
        youtubeLink: ''
      }
    }));
  };

  // Render methods
  const renderEventDetails = () => (
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
                  const value = e.target.value
                  if (value === '' || (lettersOnly(value) && value.length <= 20)) {
                    setEventName(value)
                  }
                }}
                maxLength={20}
                className={STYLES.input}
              />
            </div>
          ) : (
            <Select onValueChange={handleEventTypeChange}>
              <SelectTrigger className={STYLES.select}>
                <SelectValue placeholder="Event Type" />
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
                variant="outline"
                className={`w-full justify-start text-left font-normal bg-[#282828] border-none hover:bg-green-500 hover:text-white focus:border-green-500 transition-colors ${!eventDate && "text-muted-foreground"}`}
              >
                {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 bg-black border border-[#333333] overflow-hidden">
              <Calendar
                mode="single"
                selected={eventDate}
                onSelect={(date) => {
                  setEventDate(date)
                  setOpen(false)
                }}
                initialFocus
                className="bg-black"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-[#1E1E1E] hover:bg-[#282828] rounded-md flex items-center justify-center",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-400 rounded-md w-8 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[#282828] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal text-white aria-selected:opacity-100 hover:bg-[#282828] rounded-md",
                  day_selected: "bg-green-500 text-white hover:bg-green-600 hover:text-white focus:bg-green-500 focus:text-white",
                  day_today: "bg-[#282828] text-white",
                  day_outside: "text-gray-600 opacity-50",
                  day_disabled: "text-gray-600 opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                  IconRight: () => <ChevronRight className="h-4 w-4" />,
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </section>
  )

  // Inside your ServiceSchedule component, near the top with other state declarations:
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add the handleDragEnd function if not already present
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const [activeCategory, activeIndex] = activeId.split('-');
    const [overCategory, overIndex] = overId.split('-');

    if (activeCategory === overCategory) {
      setSetList(prev => {
        const newItems = [...prev[activeCategory as SetListCategories]];
        const oldIndex = parseInt(activeIndex);
        const newIndex = parseInt(overIndex);
        return {
          ...prev,
          [activeCategory]: arrayMove(newItems, oldIndex, newIndex),
        };
      });
    }
  };

  // Add these handlers
  const handleSongSearch = async (query: string) => {
    setSongSearch(query);
    
    if (!query) {
      setSpotifyResults([]);
      setShowSpotifyResults(false);
      return;
    }

    try {
      // Authenticate with Spotify if we don't have a token
      if (!spotifyApi.getAccessToken()) {
        const authenticated = await authenticateSpotify();
        if (!authenticated) {
          console.error('Failed to authenticate with Spotify');
          return;
        }
      }

      const results = await spotifyApi.searchTracks(query, { limit: 5 });
      
      if (results.body?.tracks?.items) {
        const tracks: SpotifyTrack[] = results.body.tracks.items.map((track: SpotifyApiTrack) => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          thumbnail: track.album.images[2]?.url,
          spotifyUrl: track.external_urls.spotify
        }));
        
        setSpotifyResults(tracks);
        setShowSpotifyResults(true);
      }
    } catch (error) {
      console.error('Error searching Spotify:', error);
      setSpotifyResults([]);
      setShowSpotifyResults(false);
    }
  };

  // First, create a SortableRow component that uses tr
  const SortableRow: React.FC<{
    id: string;
    song: SetListItem;
    category: string;
    index: number;
    onDelete: (category: SetListCategories, index: number) => void;
  }> = ({ id, song, category, index, onDelete }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    // Helper function to format category display
    const formatCategory = (category: string) => {
      if (category === 'altarCall') return 'Altar Call';
      return category.charAt(0).toUpperCase() + category.slice(1);
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="flex items-center gap-4 py-2 px-4 bg-[#282828] rounded-lg mb-2"
      >
        <button
          className="opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        
        <div className="flex-grow">
          <div className="font-medium text-white">{song.title}</div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-400">{song.artist}</div>
            <span className="text-xs px-2 py-0.5 bg-[#333] rounded-full text-gray-300">
              {formatCategory(category)}
            </span>
          </div>
        </div>

        <Button
          onClick={() => onDelete(category as SetListCategories, index)}
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-600 hover:bg-transparent"
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Then update the table section
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
  >
    <div className="space-y-2">
      {Object.entries(setList).every(([_, items]) => items.length === 0) ? (
        <div className="text-center py-4 text-gray-400">
          No songs added yet
        </div>
      ) : (
        <SortableContext
          items={Object.entries(setList).flatMap(([category, songs]) => 
            songs.map((_, index) => `${category}-${index}`)
          )}
          strategy={verticalListSortingStrategy}
        >
          {Object.entries(setList).flatMap(([category, songs]) =>
            songs.map((song, index) => (
              <SortableRow
                key={`${category}-${index}`}
                id={`${category}-${index}`}
                song={song}
                category={category}
                index={index}
                onDelete={handleDeleteSong}
              />
            ))
          )}
        </SortableContext>
      )}
    </div>
  </DndContext>

  // Main render
  return (
    <div className="min-h-screen p-4 md:p-8">
      <main className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className={STYLES.section}>
          <h1 className="text-4xl font-bold text-white mb-2">TechScript Generator v2</h1>
          <p className="text-lg text-gray-400">by Echo</p>
          <div className="flex items-center space-x-2 mt-6">
            <ClockIcon className="h-5 w-5 text-green-500" />
            <div className="text-gray-400">
              {currentDateTime?.toLocaleDateString()} {currentDateTime?.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Event Details */}
        {renderEventDetails()}

        {/* Programme Flow */}
        <section className={STYLES.section}>
          <h2 className={STYLES.sectionTitle}>Programme Flow</h2>
          <div className={STYLES.card}>
            {programmeFlow.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <Input
                  placeholder="Enter Programme Flow"
                  value={item.name}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || (lettersOnly(value) && value.length <= 20)) {
                      updateProgrammeItem(index, 'name', value)
                    }
                  }}
                  maxLength={20}
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

            <div className="flex justify-end mt-4 text-gray-400">
              Total Duration: {' '}
              <span className="text-green-500 ml-2">
                {calculateTotalHours(programmeFlow).split('h')[0]} Hour & {' '}
                {calculateTotalHours(programmeFlow).split('h')[1].replace('m', '')} Minutes
              </span>
            </div>
          </div>
        </section>

        {/* Dress Code section */}
        <section className={STYLES.section}>
          <h2 className={STYLES.sectionTitle}>Dress Code</h2>
          <div className={STYLES.card}>
            {/* Change grid-cols-3 to grid-cols-1 on mobile, grid-cols-2 on medium screens, and grid-cols-3 on large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Primary Color */}
              <div>
                <label className="text-gray-400 mb-2 block">Primary Color</label>
                <div className="flex h-10 w-full rounded-md bg-[#282828] px-3 items-center">
                  <input 
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 mr-2 cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-transparent border-none text-white font-mono focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="text-gray-400 mb-2 block">Secondary Color</label>
                <div className="flex h-10 w-full rounded-md bg-[#282828] px-3 items-center">
                  <input 
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 mr-2 cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-transparent border-none text-white font-mono focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Random Colors Button */}
              <div className="md:col-span-2 lg:col-span-1"> {/* Make button span 2 columns on medium screens */}
                <label className="text-gray-400 mb-2 block">Quick Generate</label>
                <Button
                  onClick={() => {
                    setPrimaryColor(generateRandomColor());
                    setSecondaryColor(generateRandomColor());
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white transition-colors h-10"
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
                        setSermonSeries(e.target.value)
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
                        setSermonTitle(e.target.value)
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
                        {filteredBooks.map((bookName) => (
                          <div
                            key={bookName}
                            className="px-3 py-2 hover:bg-[#383838] cursor-pointer"
                            onClick={() => {
                              setBookSearch(bookName)
                              setBook(bookName)
                              setIsBookDropdownOpen(false)
                              setFilteredBooks([])
                            }}
                          >
                            {bookName}
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
                      const value = e.target.value
                      if (/^\d{0,3}$/.test(value)) {
                        setChapter(value)
                      }
                    }}
                  />
                  <Input
                    placeholder="Verse"
                    type="text"
                    value={verse}
                    className={`${STYLES.input} w-24`}
                    onChange={(e) => {
                      const value = e.target.value
                      if (
                        (value === '' || /^[0-9-]+$/.test(value)) &&
                        (value.replace('-', '').length <= 5)
                      ) {
                        setVerse(value)
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
          
          <div className={STYLES.card}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              {/* Category Select - Make it full width on mobile */}
              <Select
                value={currentCategory}
                onValueChange={(value: SetListCategories) => setCurrentCategory(value)}
              >
                <SelectTrigger className={`${STYLES.select} w-full sm:w-48`}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="praise">Praise</SelectItem>
                  <SelectItem value="worship">Worship</SelectItem>
                  <SelectItem value="altarCall">Altar Call</SelectItem>
                  <SelectItem value="revival">Revival</SelectItem>
                </SelectContent>
              </Select>

              {/* Search and Add Song Row - Stack inputs on mobile */}
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search Song Title"
                    value={currentCategory ? inputs[currentCategory]?.title || songSearch : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleSongSearch(value);
                      if (currentCategory) {
                        setInputs(prev => ({
                          ...prev,
                          [currentCategory]: {
                            ...prev[currentCategory],
                            title: value
                          }
                        }));
                      }
                    }}
                    className={STYLES.input}
                    disabled={!currentCategory}
                  />
                  {/* Spotify Results Dropdown */}
                  {showSpotifyResults && spotifyResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#282828] rounded-lg shadow-lg max-h-60 overflow-auto">
                      {spotifyResults.map((track) => (
                        <div
                          key={track.id}
                          className="px-4 py-2 hover:bg-[#383838] cursor-pointer flex items-center gap-3"
                          onClick={() => {
                            setInputs(prev => ({
                              ...prev,
                              [currentCategory]: {
                                ...prev[currentCategory],
                                title: track.title,
                                artist: track.artist
                              }
                            }));
                            setSpotifyResults([]);
                            setShowSpotifyResults(false);
                            setSongSearch('');
                          }}
                        >
                          {track.thumbnail && (
                            <Image
                              src={track.thumbnail}
                              alt={track.title}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium">{track.title}</div>
                            <div className="text-sm text-gray-400">{track.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Artist"
                    value={currentCategory ? inputs[currentCategory].artist : ''}
                    onChange={(e) => setInputs(prev => ({
                      ...prev,
                      [currentCategory]: {
                        ...prev[currentCategory],
                        artist: e.target.value
                      }
                    }))}
                    className={`${STYLES.input} flex-1 sm:w-64`}
                    disabled={!currentCategory}
                  />
                  <Button 
                    onClick={() => handleAddSong(currentCategory)} 
                    className={`${STYLES.button.primary}`}
                    disabled={!inputs[currentCategory]?.title || !currentCategory}
                  >
                    <PlusIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Song List */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-2">
                {Object.entries(setList).every(([_, songs]) => songs.length === 0) ? (
                  <div className="text-center py-4 text-gray-400">
                    No songs added yet
                  </div>
                ) : (
                  <SortableContext
                    items={Object.entries(setList).flatMap(([category, songs]) => 
                      songs.map((_, index) => `${category}-${index}`)
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    {Object.entries(setList).flatMap(([category, songs]) =>
                      songs.map((song, index) => (
                        <SortableRow
                          key={`${category}-${index}`}
                          id={`${category}-${index}`}
                          song={song}
                          category={category}
                          index={index}
                          onDelete={handleDeleteSong}
                        />
                      ))
                    )}
                  </SortableContext>
                )}
              </div>
            </DndContext>
          </div>
        </section>

        {/* Roles Section */}
        <section className={STYLES.section}>
          <h2 className={STYLES.sectionTitle}>Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                      <SelectItem key={preacher.id} value={preacher.id.toString()}>
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
                      <SelectItem key={person.id} value={person.id.toString()}>
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
                <Select value={selectedWorshipLeader} onValueChange={setSelectedWorshipLeader}>
                  <SelectTrigger className={STYLES.select}>
                    <SelectValue placeholder="Worship Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {worshipLeaders
                      .filter(leader => {
                        const selectedAsVocalist = selectedVocalists.includes(leader.id.toString())
                        return !selectedAsVocalist || selectedWorshipLeader === leader.id.toString()
                      })
                      .map((leader) => (
                        <SelectItem key={leader.id} value={leader.id.toString()}>
                          {leader.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Key Vocals</h4>
                  <div className="space-y-2">
                    {keyVocals.map((vocal, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-grow">
                          <Select
                            value={selectedVocalists[index] || ""}
                            onValueChange={(value) => {
                              const newSelected = [...selectedVocalists]
                              newSelected[index] = value
                              setSelectedVocalists(newSelected)
                            }}
                          >
                            <SelectTrigger className={STYLES.select}>
                              <SelectValue placeholder={`Select ${vocal}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {vocalists
                                .filter(vocalist => {
                                  const selectedInOtherPosition = selectedVocalists
                                    .filter((_, i) => i !== index)
                                    .includes(vocalist.id.toString())
                                  const selectedAsLeader = selectedWorshipLeader === vocalist.id.toString()
                                  return !selectedInOtherPosition && !selectedAsLeader
                                })
                                .map((vocalist) => (
                                  <SelectItem key={vocalist.id} value={vocalist.id.toString()}>
                                    {vocalist.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
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
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      setKeyVocals(prev => [...prev, `Voice ${prev.length + 1}`])
                      setSelectedVocalists(prev => [...prev, ''])
                    }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Acoustic Guitar', 'Electric Guitar', 'Bass Guitar', 'Keyboard', 'Drums'].map((instrument) => {
                  const availableMusicians = musicians.filter(m => {
                    const playsInstrument = m.instrument === instrument
                    const musicianName = m.name
                    const isSelectedElsewhere = Object.entries(selectedMusicians).some(([otherInstrument, selectedId]) => {
                      const selectedMusician = musicians.find(m => m.id.toString() === selectedId)
                      return otherInstrument !== instrument && selectedMusician?.name === musicianName
                    })
                    return playsInstrument && !isSelectedElsewhere
                  })

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
                              <SelectItem value="no-musicians" disabled>
                                No musicians available
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
                  )
                })}
              </div>
            </div>

            {/* Creatives */}
            <div className={STYLES.card}>
              <h3 className={STYLES.subsectionTitle}>Creatives</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Lighting', 'Visual Lyrics', 'Prompter', 'Photography', 'Content Writer'].map((role) => {
                  const availableCreatives = creatives.filter(c => {
                    const hasRole = c.role === role
                    const creativeName = c.name
                    const isSelectedElsewhere = Object.entries(selectedCreatives).some(([otherRole, selectedId]) => {
                      const selectedCreative = creatives.find(c => c.id.toString() === selectedId)
                      return otherRole !== role && selectedCreative?.name === creativeName
                    })
                    return hasRole && !isSelectedElsewhere
                  })

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
                            {availableCreatives.map((creative) => (
                              <SelectItem key={creative.id} value={creative.id.toString()}>
                                {creative.name}
                              </SelectItem>
                            ))}
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
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Summary Modal */}
        {showSummary && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSummary(false);
              }
            }}
          >
            <div className="flex flex-col gap-4 my-4">
              <div 
                ref={summaryRef} 
                data-summary-ref
                className={`${STYLES.summary.container} rounded-b-none border-b-0`}
              >
                {/* Updated TechScript title */}
                <div className="flex flex-col items-center mb-4">
                  <h3 className="text-2xl font-bold text-green-500">
                    T E C H S C R I P T
                  </h3>
                  {generatedDateTime && (
                    <div className="text-sm text-gray-400 mt-2">
                      Generated: {generatedDateTime.toLocaleDateString()} {generatedDateTime.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Event Details</h4>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Event Type</span>
                    <span className={STYLES.summary.value}>: {getEventTypeDisplay()}</span>
                  </div>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Date</span>
                    <span className={STYLES.summary.value}>: {eventDate ? format(eventDate, "PPP") : 'Not set'}</span>
                  </div>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Duration</span>
                    <span className={STYLES.summary.value}>: {calculateTotalHours(programmeFlow)}</span>
                  </div>
                </div>

                {/* Programme Flow */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Programme Flow</h4>
                  {programmeFlow.some(item => item.name && item.startTime && item.endTime) ? (
                    programmeFlow.map((item, index) => (
                      item.name && item.startTime && item.endTime && (
                        <div key={index} className={STYLES.summary.row}>
                          <span className={STYLES.summary.label}>{item.name}</span>
                          <span className={STYLES.summary.value}>
                            : {formatTime(item.startTime)} – {formatTime(item.endTime)}
                          </span>
                        </div>
                      )
                    ))
                  ) : (
                    <div className={STYLES.summary.row}>
                      <span className={STYLES.summary.value}>Not set</span>
                    </div>
                  )}
                </div>

                {/* Dress Code section */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Dress Code</h4>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Primary Color</span>
                    <span className={STYLES.summary.value}>
                      : <span style={{ color: primaryColor }}>●</span> <span style={{ color: primaryColor }}>{primaryColor}</span>
                    </span>
                  </div>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Secondary Color</span>
                    <span className={STYLES.summary.value}>
                      : <span style={{ color: secondaryColor }}>●</span> <span style={{ color: secondaryColor }}>{secondaryColor}</span>
                    </span>
                  </div>
                </div>

                {/* Sermon Details */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Sermon Details</h4>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Series</span>
                    <span className={STYLES.summary.value}>: {sermonSeries || "Not set"}</span>
                  </div>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Title</span>
                    <span className={STYLES.summary.value}>: {sermonTitle || "Not set"}</span>
                  </div>
                  <div className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>Bible Verse</span>
                    <span className={STYLES.summary.value}>
                      : {book && chapter && verse ? `${book} ${chapter}:${verse}` : "Not set"}
                    </span>
                  </div>
                </div>

                {/* Team */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Team</h4>
                  
                  <div className={STYLES.summary.teamGrid.container}>
                    {/* Preaching */}
                    <div className={STYLES.summary.teamGrid.section}>
                      <div className={STYLES.summary.teamGrid.title}>Preaching</div>
                      {(selectedPreacher || selectedSupport) ? (
                        <>
                          {selectedPreacher && (
                            <div className={STYLES.summary.row}>
                              <span className={STYLES.summary.label}>Preacher</span>
                              <span className={STYLES.summary.value}>: {preachers.find(p => p.id.toString() === selectedPreacher)?.name}</span>
                            </div>
                          )}
                          {selectedSupport && (
                            <div className={STYLES.summary.row}>
                              <span className={STYLES.summary.label}>Support</span>
                              <span className={STYLES.summary.value}>: {preachingSupport.find(p => p.id.toString() === selectedSupport)?.name}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.value}>Not set</span>
                        </div>
                      )}
                    </div>

                    {/* Worship */}
                    <div className={STYLES.summary.teamGrid.section}>
                      <div className={STYLES.summary.teamGrid.title}>Worship</div>
                      {selectedWorshipLeader ? (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.label}>Worship Leader</span>
                          <span className={STYLES.summary.value}>: {worshipLeaders.find(w => w.id.toString() === selectedWorshipLeader)?.name}</span>
                        </div>
                      ) : (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.value}>Not set</span>
                        </div>
                      )}
                    </div>

                    {/* Creatives */}
                    <div className={STYLES.summary.teamGrid.section}>
                      <div className={STYLES.summary.teamGrid.title}>Creatives</div>
                      {Object.entries(selectedCreatives).some(([_, id]) => id) ? (
                        Object.entries(selectedCreatives).map(([role, id]) => id && (
                          <div key={role} className={STYLES.summary.row}>
                            <span className={STYLES.summary.label}>{role}</span>
                            <span className={STYLES.summary.value}>: {creatives.find(c => c.id.toString() === id)?.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.value}>Not set</span>
                        </div>
                      )}
                    </div>

                    {/* Key Vocals */}
                    <div className={STYLES.summary.teamGrid.section}>
                      <div className={STYLES.summary.teamGrid.title}>Key Vocals</div>
                      {selectedVocalists.some(id => id) ? (
                        selectedVocalists.map((id, index) => id && (
                          <div key={index} className={STYLES.summary.row}>
                            <span className={STYLES.summary.label}>Vocalist {index + 1}</span>
                            <span className={STYLES.summary.value}>: {vocalists.find(v => v.id.toString() === id)?.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.value}>Not set</span>
                        </div>
                      )}
                    </div>

                    {/* Musicians */}
                    <div className={STYLES.summary.teamGrid.section}>
                      <div className={STYLES.summary.teamGrid.title}>Musicians</div>
                      {Object.entries(selectedMusicians).some(([_, id]) => id) ? (
                        Object.entries(selectedMusicians).map(([instrument, id]) => id && (
                          <div key={instrument} className={STYLES.summary.row}>
                            <span className={STYLES.summary.label}>{instrument}</span>
                            <span className={STYLES.summary.value}>: {musicians.find(m => m.id.toString() === id)?.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className={STYLES.summary.row}>
                          <span className={STYLES.summary.value}>Not set</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Set List */}
                <div className={STYLES.summary.section}>
                  <h4 className={STYLES.summary.sectionTitle}>Set List</h4>
                  {Object.entries(setList).some(([_, songs]) => songs.length > 0) ? (
                    Object.entries(setList).map(([category, songs]) => songs.length > 0 && (
                      <div key={category} className={STYLES.summary.setList.section}>
                        <div className={STYLES.summary.setList.category}>
                          {category === 'altarCall' ? 'Altar Call' : category.charAt(0).toUpperCase() + category.slice(1)}
                        </div>
                        {songs.map((song, index) => (
                          <div key={index} className={STYLES.summary.setList.row}>
                            <span className={STYLES.summary.setList.label}>
                              {index + 1}. {song.title}
                            </span>
                            <span className={STYLES.summary.setList.value}>
                              : {song.artist}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className={STYLES.summary.row}>
                      <span className={STYLES.summary.value}>Not set</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Updated buttons container */}
              <div className={`${STYLES.card} rounded-t-none border-t-0 mt-[-1px]`}>
                {'ClipboardItem' in window && (
                  <Button 
                    onClick={() => copyToClipboard(summaryRef)}
                    className={`${STYLES.button.primary} w-full`}
                  >
                    Copy to Clipboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Updated Notification */}
        {showNotification && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg text-lg font-medium">
              {notificationMessage}
            </div>
          </div>
        )}
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
    </div>
  )
}