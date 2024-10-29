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
  const [setList, setSetList] = useState({
    praise: [{ title: '', by: '' }],
    worship: [{ title: '', by: '' }],
    altarCall: [{ title: '', by: '' }]
  })
  const [activeTab, setActiveTab] = useState('home')
  const [keyVocals, setKeyVocals] = useState(['Soprano', 'Alto', 'Tenor', 'Bass'])
  const [recordedData, setRecordedData] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false)

  const contentRef = useRef(null)

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
      [category]: [...prev[category], { title: '', by: '' }]
    }))
  }

  const updateSetListItem = (category: 'praise' | 'worship' | 'altarCall', index: number, field: 'title' | 'by', value: string) => {
    setSetList(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

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
                    <div key={index} className="flex items-center mb-2">
                      <Input
                        placeholder="Title"
                        value={item.title}
                        onChange={(e) => updateSetListItem(category, index, 'title', e.target.value)}
                        className="mr-2 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                      />
                      <Input
                        placeholder="By"
                        value={item.by}
                        onChange={(e) => updateSetListItem(category, index, 'by', e.target.value)}
                        className="mr-2 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                      />
                      <Input
                        placeholder="YouTube Link"
                        className="mr-2 bg-[#282828] border-none hover:border-green-500 focus:border-green-500 transition-colors"
                      />
                      <Button onClick={() => deleteSetListItem(category, index)} className="bg-red-500 hover:bg-red-600 transition-colors">
                        <TrashIcon className="h-5 w-5" />
                      </Button>
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