'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Button } from './ui/Button';

interface Post {
  _id: string;
  title: string;
  caption: string;
  platforms: string[];
  scheduleAt: string;
  hashtags: string[];
  mediaUrls: string[];
  status: string;
}

interface CalendarGridProps {
  onPostUpdate: () => void;
  posts: Post[];
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  onPostUpdate,
  posts,
}) => {
  const { currentWorkspace } = useAuth();
  
  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar grid dates
  useEffect(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday etc.
    const totalDays = lastDayOfMonth.getDate();

    const tempDays: Date[] = [];

    // Pads for previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      tempDays.push(d);
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      tempDays.push(d);
    }

    // Pads for next month to complete 6-row grid (42 cells)
    const totalCellsNeeded = 42;
    const remainingPads = totalCellsNeeded - tempDays.length;
    for (let i = 1; i <= remainingPads; i++) {
      const d = new Date(year, month + 1, i);
      tempDays.push(d);
    }

    setDaysInMonth(tempDays);
  }, [currentDate, year, month]);

  const changeMonth = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  // Drag & Drop Reschedule Handlers
  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!postId || !currentWorkspace) return;

    // Reset dragged state
    setDraggedPostId(null);

    // Keep the hours/minutes/seconds of original post scheduleAt
    const originalPost = posts.find((p) => p._id === postId);
    if (!originalPost) return;

    const originalDate = new Date(originalPost.scheduleAt);
    const newScheduledDate = new Date(targetDate);
    newScheduledDate.setHours(originalDate.getHours());
    newScheduledDate.setMinutes(originalDate.getMinutes());
    newScheduledDate.setSeconds(originalDate.getSeconds());

    if (newScheduledDate <= new Date()) {
      alert('Cannot reschedule post into the past');
      return;
    }

    try {
      await api.patch(`/workspaces/${currentWorkspace._id}/posts/${postId}`, {
        scheduleAt: newScheduledDate.toISOString(),
      });
      onPostUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule post');
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getPostsForDay = (date: Date) => {
    return posts.filter((post) => {
      const pDate = new Date(post.scheduleAt);
      return (
        pDate.getDate() === date.getDate() &&
        pDate.getMonth() === date.getMonth() &&
        pDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Calendar Header with toggles */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {monthNames[month]} {year}
          </h2>
          <p className="text-sm text-slate-400">Drag & drop cards to reschedule campaigns</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => changeMonth('prev')}
            className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer"
          >
            ← Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
            className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer"
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => changeMonth('next')}
            className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer"
          >
            Next →
          </Button>
        </div>
      </div>

      {/* Weekday Labels Grid */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Monthly Cells Grid */}
      <div className="grid grid-cols-7 gap-2 auto-rows-[120px] md:auto-rows-[140px]">
        {daysInMonth.map((day, index) => {
          const dayPosts = getPostsForDay(day);
          const currentMonthClass = day.getMonth() === month ? 'text-slate-100' : 'text-slate-600';
          const todayClass = isToday(day) ? 'border-cyan-500/50 bg-cyan-950/10 shadow-[inset_0_0_12px_rgba(6,182,212,0.06)]' : 'border-slate-800/80 bg-slate-950/20';

          return (
            <div
              key={index}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              className={`rounded-xl border p-2 flex flex-col gap-1 overflow-y-auto transition-colors duration-200 hover:border-cyan-500/20 ${todayClass}`}
            >
              {/* Day Number */}
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold leading-none ${currentMonthClass}`}>
                  {day.getDate()}
                </span>
                {isToday(day) && (
                  <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.5 rounded uppercase leading-none">
                    Today
                  </span>
                )}
              </div>

              {/* Day Posts cards list */}
              <div className="flex flex-col gap-1.5 mt-1 overflow-visible">
                {dayPosts.map((post) => (
                  <div
                    key={post._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post._id)}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition-all select-none shadow-[0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden"
                  >
                    <div className="text-[10px] font-bold text-white truncate leading-tight">
                      {post.title}
                    </div>
                    
                    {/* Platform badges & Time */}
                    <div className="flex items-center justify-between mt-1 text-[8px] text-slate-500">
                      <div className="flex gap-0.5 uppercase tracking-wide font-extrabold text-cyan-400">
                        {post.platforms.map((p) => p.charAt(0)).join('+')}
                      </div>
                      <div className="leading-none">
                        {new Date(post.scheduleAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
