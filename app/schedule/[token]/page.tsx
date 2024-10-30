'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from "date-fns"

const STYLES = {
  card: "bg-[#1E1E1E] rounded-lg p-6 border border-[#333333]",
  sectionTitle: "text-lg font-semibold text-green-500 mb-2",
}

type Schedule = {
  event_name: string;
  event_date: string;
  dress_code?: string;
  programme_flow: { name: string; startTime: string; endTime: string }[];
  set_list: { [key: string]: { title: string; artist: string; youtubeLink?: string }[] };
  team_assignments: {
    preacher: string;
    preachingSupport: string;
    worshipLeader: string;
    vocalists?: string[];
    musicians?: { [key: string]: string };
    creatives?: { [key: string]: string };
  };
};

export default function ScheduleView() {
  const { token } = useParams()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      console.log('Fetching schedule for token:', token);
      
      const { data, error } = await supabase
        .from('service_schedules')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        console.error('Error fetching schedule:', error);
        return;
      }

      console.log('Fetched data:', data);
      setSchedule(data);
      setLoading(false);
    };

    fetchSchedule();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white">Loading schedule...</div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Schedule Not Found</h2>
          <p className="text-gray-400">The schedule you're looking for doesn't exist or has been removed.</p>
          <p className="text-gray-500">Token: {token}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className={`${STYLES.card} max-w-3xl mx-auto`}>
        {/* Event Details */}
        <div className="space-y-6">
          <div>
            <h4 className={STYLES.sectionTitle}>Event Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">Event Type:</span>
                <p>{schedule.event_name}</p>
              </div>
              <div>
                <span className="text-gray-400">Date:</span>
                <p>{format(new Date(schedule.event_date), "PPP")}</p>
              </div>
              {schedule.dress_code && (
                <div className="col-span-2">
                  <span className="text-gray-400">Dress Code:</span>
                  <p>{schedule.dress_code}</p>
                </div>
              )}
            </div>
          </div>

          {/* Programme Flow */}
          <div>
            <h4 className={STYLES.sectionTitle}>Programme Flow</h4>
            <div className="space-y-2">
              {schedule.programme_flow.map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-gray-400">{item.startTime} - {item.endTime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Set List */}
          <div>
            <h4 className={STYLES.sectionTitle}>Set List</h4>
            <div className="space-y-4">
              {Object.entries(schedule.set_list).map(([category, songs]: [string, any[]]) => (
                songs.length > 0 && (
                  <div key={category}>
                    <h5 className="text-gray-400 capitalize mb-1">
                      {category === 'altarCall' ? 'Altar Call' : category}
                    </h5>
                    <div className="space-y-1">
                      {songs.map((song, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <span>{song.title}</span>
                            <span className="text-gray-400 ml-2">- {song.artist}</span>
                          </div>
                          {song.youtubeLink && (
                            <a 
                              href={song.youtubeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-500 text-sm hover:underline"
                            >
                              Watch
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Team */}
          <div>
            <h4 className={STYLES.sectionTitle}>Team</h4>
            <div className="grid grid-cols-2 gap-6">
              {/* Preaching */}
              <div>
                <h5 className="text-gray-400 mb-1">Preaching</h5>
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-400">Preacher: </span>
                    <span>{schedule.team_assignments.preacher}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Support: </span>
                    <span>{schedule.team_assignments.preachingSupport}</span>
                  </div>
                </div>
              </div>

              {/* Worship */}
              <div>
                <h5 className="text-gray-400 mb-1">Worship</h5>
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-400">Worship Leader: </span>
                    <span>{schedule.team_assignments.worshipLeader}</span>
                  </div>
                  {schedule.team_assignments.vocalists?.map((id, index) => (
                    <div key={index}>
                      <span className="text-gray-400">Vocalist {index + 1}: </span>
                      <span>{id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Musicians */}
              <div>
                <h5 className="text-gray-400 mb-1">Musicians</h5>
                <div className="space-y-1">
                  {Object.entries(schedule.team_assignments.musicians || {}).map(([role, id]: [string, string]) => (
                    <div key={role}>
                      <span className="text-gray-400">{role}: </span>
                      <span>{id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Creatives */}
              <div>
                <h5 className="text-gray-400 mb-1">Creatives</h5>
                <div className="space-y-1">
                  {schedule.team_assignments.creatives && Object.entries(schedule.team_assignments.creatives).map(([role, id]: [string, string]) => (
                    <div key={role}>
                      <span className="text-gray-400">
                        {role === 'Lighting' ? 'Lighting Director' :
                         role === 'Visual Lyrics' ? 'Visual Lyrics Operator' :
                         role === 'Prompter' ? 'Prompter Operator' :
                         role === 'Photography' ? 'Photographer' :
                         role === 'Content Writer' ? 'Content Writer' : 
                         role}: 
                      </span>
                      <span>{id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 