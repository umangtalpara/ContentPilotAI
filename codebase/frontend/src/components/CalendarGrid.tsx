'use client';

import React, { useEffect, useState } from 'react';
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
  errorMessage?: string;
}

interface CalendarGridProps {
  onPostUpdate: () => void;
  posts: Post[];
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  publishing: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  failed: 'bg-red-500/20 text-red-300 border-red-500/40',
  draft: 'bg-slate-600/20 text-slate-300 border-slate-500/40',
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({ onPostUpdate, posts }) => {
  const { currentWorkspace } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retryingPostId, setRetryingPostId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayIndex = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    const tempDays: Date[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      tempDays.push(new Date(year, month, -i));
    }
    for (let i = 1; i <= totalDays; i++) {
      tempDays.push(new Date(year, month, i));
    }
    const totalCellsNeeded = 42;
    const remainingPads = totalCellsNeeded - tempDays.length;
    for (let i = 1; i <= remainingPads; i++) {
      tempDays.push(new Date(year, month + 1, i));
    }

    setDaysInMonth(tempDays);
  }, [currentDate, year, month]);

  const changeMonth = (direction: 'next' | 'prev') => {
    setFeedback(null);
    if (direction === 'next') setCurrentDate(new Date(year, month + 1, 1));
    else setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setFeedback(null);
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!postId || !currentWorkspace) return;
    setDraggedPostId(null);

    const originalPost = posts.find((p) => p._id === postId);
    if (!originalPost) return;

    const originalDate = new Date(originalPost.scheduleAt);
    const newScheduledDate = new Date(targetDate);
    newScheduledDate.setHours(originalDate.getHours());
    newScheduledDate.setMinutes(originalDate.getMinutes());
    newScheduledDate.setSeconds(originalDate.getSeconds());

    if (newScheduledDate <= new Date()) {
      setFeedback('Cannot reschedule post into the past.');
      return;
    }

    try {
      await api.patch(`/workspaces/${currentWorkspace._id}/posts/${postId}`, {
        scheduleAt: newScheduledDate.toISOString(),
      });
      setFeedback('Post rescheduled successfully.');
      onPostUpdate();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to reschedule post.');
    }
  };

  const retryFailedPost = async (postId: string) => {
    if (!currentWorkspace) return;
    setFeedback(null);
    setRetryingPostId(postId);
    try {
      await api.post(`/workspaces/${currentWorkspace._id}/posts/${postId}/retry`);
      setFeedback('Failed post queued for retry.');
      onPostUpdate();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to retry post.');
    } finally {
      setRetryingPostId(null);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getPostsForDay = (date: Date) =>
    posts.filter((post) => {
      const pDate = new Date(post.scheduleAt);
      return pDate.getDate() === date.getDate() && pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
    });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="flex flex-col gap-6 w-full">
      {feedback && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5 text-xs text-cyan-300">
          {feedback}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {monthNames[month]} {year}
          </h2>
          <p className="text-sm text-slate-400">Drag and drop cards to reschedule campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => changeMonth('prev')} className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer">
            Previous
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer">
            Today
          </Button>
          <Button variant="outline" onClick={() => changeMonth('next')} className="min-h-[40px] h-10 px-4 py-2 border-slate-800 text-xs md:text-sm font-semibold hover:bg-slate-900 cursor-pointer">
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-2 auto-rows-[130px] md:auto-rows-[150px]">
        {daysInMonth.map((day, index) => {
          const dayPosts = getPostsForDay(day);
          const currentMonthClass = day.getMonth() === month ? 'text-slate-100' : 'text-slate-600';
          const todayClass = isToday(day)
            ? 'border-cyan-500/50 bg-cyan-950/10 shadow-[inset_0_0_12px_rgba(6,182,212,0.06)]'
            : 'border-slate-800/80 bg-slate-950/20';

          return (
            <div
              key={index}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              className={`rounded-xl border p-2 flex flex-col gap-1 overflow-y-auto transition-colors duration-200 hover:border-cyan-500/20 ${todayClass}`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold leading-none ${currentMonthClass}`}>{day.getDate()}</span>
                {isToday(day) && <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.5 rounded uppercase leading-none">Today</span>}
              </div>

              <div className="flex flex-col gap-1.5 mt-1 overflow-visible">
                {dayPosts.map((post) => (
                  <div
                    key={post._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post._id)}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition-all select-none shadow-[0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden"
                  >
                    <div className="text-[10px] font-bold text-white truncate leading-tight">{post.title}</div>

                    <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500">
                      <div className="flex gap-0.5 uppercase tracking-wide font-extrabold text-cyan-400">
                        {post.platforms.map((p) => p.charAt(0)).join('+')}
                      </div>
                      <div className="leading-none">{new Date(post.scheduleAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`text-[8px] px-1.5 py-0.5 border rounded uppercase font-bold tracking-wide ${STATUS_STYLE[post.status] || STATUS_STYLE.draft}`}>
                        {post.status}
                      </span>
                      {post.status === 'failed' && (
                        <button
                          type="button"
                          className="text-[8px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-300 hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            void retryFailedPost(post._id);
                          }}
                          disabled={retryingPostId === post._id}
                        >
                          {retryingPostId === post._id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </div>

                    {post.status === 'failed' && post.errorMessage && (
                      <div className="mt-1 text-[8px] text-red-300" title={post.errorMessage}>
                        {post.errorMessage}
                      </div>
                    )}
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
