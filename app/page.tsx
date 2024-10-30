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
type SetListCategories = 'praise' | 'worship' | 'altarCall' | 'revival'

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

const debounce = <T extends string>(
  func: (category: T, query: string) => Promise<void> | void,
  wait: number
): (category: T, query: string) => void => {
  let timeout: NodeJS.Timeout
  return (category: T, query: string) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(category, query), wait)
  }
}

// Styles
const STYLES = {
  input: "w-full bg-[#282828] border-none focus:ring-2 focus:ring-green-500 hover:bg-[#323232] transition-colors",
  select: "w-full bg-[#282828] border-none hover:bg-[#323232] focus:ring-2 focus:ring-green-500 transition-colors",
  button: {
    primary: "bg-green-500 hover:bg-green-600 text-white transition-colors font-medium",
    secondary: "bg-[#323232] hover:bg-[#404040] text-white transition-colors font-medium",
    danger: "bg-red-500 hover:bg-red-600 text-white transition-colors font-medium",
  },
  card: "bg-[#1E1E1E] rounded-lg p-6 border border-[#333333]",
  section: "mb-12",
  sectionTitle: "text-2xl font-bold mb-6 text-white",
  subsectionTitle: "text-xl font-semibold mb-4 text-white",
  summary: {
    container: "bg-[#1E1E1E] rounded-lg p-4 max-w-3xl w-full max-h-[85vh] overflow-y-auto font-mono text-sm",
    section: "p-4 bg-[#282828] rounded-lg mb-4",
    sectionTitle: "text-base font-semibold text-green-500 mb-3",
    label: "text-white inline-block w-40",
    value: "text-gray-400 flex-1",
    row: "mb-1.5 flex items-center",
    teamGrid: {
      container: "grid grid-cols-2 gap-x-8 gap-y-4",
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

// Add this interface for Spotify API track type
interface SpotifyApiTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
  }
  external_urls: {
    spotify: string
  }
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
    { name: 'Countdown Begins', startTime: '08:55', endTime: '09:00' }
  ])
  const [setList, setSetList] = useState<Record<SetListCategories, SetListItem[]>>({
    praise: [],
    worship: [],
    altarCall: [],
    revival: []
  })
  const [keyVocals, setKeyVocals] = useState(['Soprano', 'Alto', 'Tenor', 'Bass'])
  const [showSummary, setShowSummary] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<SetListCategories, SpotifyTrack[]>>({
    praise: [],
    worship: [],
    altarCall: [],
    revival: []
  })
  const [isLoading, setIsLoading] = useState<Record<SetListCategories, boolean>>({
    praise: false,
    worship: false,
    altarCall: false,
    revival: false
  })
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<SetListCategories, CategoryInputs>>({
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
        setSuggestions({
          praise: [],
          worship: [],
          altarCall: [],
          revival: []
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleCreate = (): void => {
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

  const addSetListItem = (category: keyof typeof setList) => {
    if (!inputs[category].title.trim()) return

    setSetList(prev => ({
      ...prev,
      [category]: [...prev[category], {
        ...inputs[category],
        isLoading: false,
        isDetailsVisible: false,
      }]
    }))

    setInputs(prev => ({
      ...prev,
      [category]: { title: '', artist: '', youtubeLink: '' }
    }))
  }

  const deleteSetListItem = (category: keyof typeof setList, index: number) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }))
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

  // Spotify search
  const debouncedSearch = debounce(async (category: string, query: string) => {
    if (!query.trim()) {
      setSuggestions(prev => ({ ...prev, [category]: [] }))
      return
    }

    setIsLoading(prev => ({ ...prev, [category]: true }))

    try {
      if (!spotifyApi.getAccessToken()) {
        const authenticated = await authenticateSpotify()
        if (!authenticated) return
      }

      const results = await spotifyApi.searchTracks(query, { limit: 5 })
      const tracks: SpotifyTrack[] = results.body.tracks?.items.map((track: SpotifyApiTrack) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        thumbnail: track.album.images[0]?.url,
        spotifyUrl: track.external_urls.spotify
      })) || []

      setSuggestions(prev => ({ ...prev, [category]: tracks }))
    } catch (error) {
      console.error('Error searching Spotify:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, [category]: false }))
    }
  }, 500)

  // Screenshot handling
  const captureAndCopyToClipboard = async (ref: React.RefObject<HTMLElement>) => {
    if (ref.current) {
      try {
        const colorBoxes = ref.current.querySelectorAll('.color-box')
        colorBoxes.forEach((box) => {
          if (box instanceof HTMLElement) {
            box.style.transform = 'translateY(4px)'
          }
        })

        const scale = 4
        const options = {
          scale,
          width: ref.current.scrollWidth,
          height: ref.current.scrollHeight,
          scrollY: -window.scrollY,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.offsetHeight,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#1E1E1E',
          logging: false,
        }

        const canvas = await html2canvas(ref.current, options)

        colorBoxes.forEach((box) => {
          if (box instanceof HTMLElement) {
            box.style.transform = 'translateY(2px)'
          }
        })

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0)
        })

        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])

        setShowSummary(false)
        setShowNotification(true)
        
        setTimeout(() => {
          setShowNotification(false)
        }, 3000)
        
      } catch (error) {
        console.error('Error capturing or copying image:', error)
      }
    }
  }

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
                variant="outline"
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
                  setOpen(false)
                }}
                initialFocus
                className="bg-[#282828] text-white border-green-500"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </section>
  )

  const renderCategoryInput = (category: keyof typeof setList) => (
    <div className={STYLES.card}>
      <h3 className={STYLES.subsectionTitle}>
        {category === 'altarCall' ? 'Altar Call' :
         category.charAt(0).toUpperCase() + category.slice(1)}
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
              }))
              setOpenDropdown(category)
              debouncedSearch(category, e.target.value)
            }}
            onFocus={() => setOpenDropdown(category)}
            className={STYLES.input}
          />
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
                    }))
                    setOpenDropdown(null)
                    setSuggestions(prev => ({ ...prev, [category]: [] }))
                  }}
                >
                  {track.thumbnail && (
                    <div className="relative w-10 h-10">
                      <Image
                        src={track.thumbnail}
                        alt=""
                        fill
                        className="rounded object-cover"
                      />
                    </div>
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
  )

  // Main render
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
          {renderEventDetails()}

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
                  {calculateTotalHours(programmeFlow).split('h')[0]} Hour & & {' '}
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
                  {Object.entries(setList).every(([_, items]) => items.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-400">
                        No songs added yet
                      </td>
                    </tr>
                  ) : (
                    Object.entries(setList).map(([category, items]) =>
                      items.map((item, index) => (
                        <tr key={`${category}-${index}`} className="border-t border-[#282828]">
                          <td className="py-2 capitalize">
                            {category === 'altarCall' ? 'Altar Call' : category}
                          </td>
                          <td className="py-2">{item.title}</td>
                          <td className="py-2">{item.artist}</td>
                          <td className="py-2">
                            {item.youtubeLink && (
                              <a 
                                href={item.youtubeLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-green-500 hover:text-green-400"
                              >
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

          {/* Roles Section */}
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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

      {/* Summary Modal */}
      {showSummary && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSummary(false)
            }
          }}
        >
          <div className="flex flex-col gap-6">
            <div ref={summaryRef} className={`${STYLES.summary.container} rounded-b-none border-b-0`}>
              <h3 className="text-xl font-bold text-green-500 mb-4">TechScript</h3>
              
              {/* Event Details */}
              <div className={STYLES.summary.section}>
                <h4 className={STYLES.summary.sectionTitle}>Event Details</h4>
                <div className={STYLES.summary.row}>
                  <span className={STYLES.summary.label}>Event Type</span>
                  <span className={STYLES.summary.value}>: {getEventTypeDisplay()}</span>
                </div>
                <div className={STYLES.summary.row}>
                  <span className={STYLES.summary.label}>Date</span>
                  <span className={STYLES.summary.value}>: {eventDate ? format(eventDate, "PPP") : "Not set"}</span>
                </div>
                <div className={STYLES.summary.row}>
                  <span className={STYLES.summary.label}>Duration</span>
                  <span className={STYLES.summary.value}>: {calculateTotalHours(programmeFlow)}</span>
                </div>
                <div className={STYLES.summary.row}>
                  <span className={STYLES.summary.label}>Dress Code</span>
                  <span className={STYLES.summary.value}>
                    : <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1">
                          <span 
                            className="inline-block w-4 h-4 border border-gray-600 translate-y-[2px] color-box" 
                            style={{ backgroundColor: primaryColor }}
                          ></span>
                          {primaryColor}
                        </span>
                        <span className="mx-3">&</span>
                        <span className="inline-flex items-center gap-1">
                          <span 
                            className="inline-block w-4 h-4 border border-gray-600 translate-y-[2px] color-box" 
                            style={{ backgroundColor: secondaryColor }}
                          ></span>
                          {secondaryColor}
                        </span>
                      </span>
                  </span>
                </div>
              </div>

              {/* Programme Flow */}
              <div className={STYLES.summary.section}>
                <h4 className={STYLES.summary.sectionTitle}>Programme Flow</h4>
                {programmeFlow.map((item, index) => (
                  <div key={index} className={STYLES.summary.row}>
                    <span className={STYLES.summary.label}>{item.name}</span>
                    <span className={STYLES.summary.value}>: {formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                  </div>
                ))}
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
                  <span className={STYLES.summary.value}>: {book} {chapter}:{verse}</span>
                </div>
              </div>

              {/* Team */}
              <div className={STYLES.summary.section}>
                <h4 className={STYLES.summary.sectionTitle}>Team</h4>
                
                <div className={STYLES.summary.teamGrid.container}>
                  {/* Preaching */}
                  <div className={STYLES.summary.teamGrid.section}>
                    <div className={STYLES.summary.teamGrid.title}>Preaching</div>
                    <div className={STYLES.summary.row}>
                      <span className={STYLES.summary.label}>Preacher</span>
                      <span className={STYLES.summary.value}>: {preachers.find(p => p.id.toString() === selectedPreacher)?.name || "Not selected"}</span>
                    </div>
                    <div className={STYLES.summary.row}>
                      <span className={STYLES.summary.label}>Support</span>
                      <span className={STYLES.summary.value}>: {preachingSupport.find(p => p.id.toString() === selectedSupport)?.name || "Not selected"}</span>
                    </div>
                  </div>

                  {/* Worship */}
                  <div className={STYLES.summary.teamGrid.section}>
                    <div className={STYLES.summary.teamGrid.title}>Worship</div>
                    <div className={STYLES.summary.row}>
                      <span className={STYLES.summary.label}>Worship Leader</span>
                      <span className={STYLES.summary.value}>: {worshipLeaders.find(w => w.id.toString() === selectedWorshipLeader)?.name || "Not selected"}</span>
                    </div>
                  </div>

                  {/* Creatives */}
                  <div className={STYLES.summary.teamGrid.section}>
                    <div className={STYLES.summary.teamGrid.title}>Creatives</div>
                    {Object.entries(selectedCreatives).map(([role, id]) => id && (
                      <div key={role} className={STYLES.summary.row}>
                        <span className={STYLES.summary.label}>{role}</span>
                        <span className={STYLES.summary.value}>: {creatives.find(c => c.id.toString() === id)?.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Key Vocals */}
                  <div className={STYLES.summary.teamGrid.section}>
                    <div className={STYLES.summary.teamGrid.title}>Key Vocals</div>
                    {selectedVocalists.map((id, index) => id && (
                      <div key={index} className={STYLES.summary.row}>
                        <span className={STYLES.summary.label}>Vocalist {index + 1}</span>
                        <span className={STYLES.summary.value}>: {vocalists.find(v => v.id.toString() === id)?.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Musicians */}
                  <div className={STYLES.summary.teamGrid.section}>
                    <div className={STYLES.summary.teamGrid.title}>Musicians</div>
                    {Object.entries(selectedMusicians).map(([instrument, id]) => id && (
                      <div key={instrument} className={STYLES.summary.row}>
                        <span className={STYLES.summary.label}>{instrument}</span>
                        <span className={STYLES.summary.value}>: {musicians.find(m => m.id.toString() === id)?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Set List */}
              <div className={STYLES.summary.section}>
                <h4 className={STYLES.summary.sectionTitle}>Set List</h4>
                {Object.entries(setList).map(([category, songs]) => songs.length > 0 && (
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
                ))}
              </div>
            </div>

            {/* Screenshot Button */}
            <div className={`${STYLES.card} rounded-t-none border-t-0 mt-[-1px]`}>
              <Button 
                onClick={() => captureAndCopyToClipboard(summaryRef)}
                className={`${STYLES.button.primary} w-full`}
              >
                Take Screenshot
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {showNotification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-notification z-50">
          Screenshot copied! Press Ctrl+V to paste
        </div>
      )}
    </div>
  )
}