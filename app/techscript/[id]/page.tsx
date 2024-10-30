'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TechScript() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTechScript() {
      try {
        const { data: techscript, error } = await supabase
          .from('techscripts')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setData(techscript)
      } catch (error) {
        console.error('Error fetching techscript:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTechScript()
  }, [id])

  if (loading) return <div>Loading...</div>
  if (!data) return <div>TechScript not found</div>

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200">
      {/* Use the same summary layout from your modal, but as a full page */}
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-green-500 mb-8">TechScript</h1>
        
        {/* Event Details */}
        <div className={STYLES.summary.section}>
          {/* ... Copy the summary JSX structure ... */}
        </div>

        {/* ... Copy other sections ... */}
      </div>
    </div>
  )
} 