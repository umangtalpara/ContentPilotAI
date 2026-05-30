'use client';

import React, { useState, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  title: string;
  caption: string;
  scheduleAt: string;
  platforms: string[];
  hashtags: string[];
  isValid: boolean;
  error?: string;
}

export const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentWorkspace } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csvContent =
      'title,caption,scheduleAt,platforms,hashtags\n' +
      '"Campaign Announcement","We are thrilled to launch ContentPilot AI today!","2026-06-15T12:00:00Z","linkedin,twitter","announcement,saas"\n' +
      '"Weekly Tech Tip","Always cache critical query paths to improve dashboard speeds.","2026-06-16T15:30:00Z","linkedin","education,tech"\n' +
      '"Meme Friday","Me compiling local code after 4 hours of debugging. 😂","2026-06-19T17:00:00Z","twitter","funny,dev"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contentpilot_bulk_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseClientCsv(text);
        setParsedRows(parsed);
      } catch (err: any) {
        setErrorMsg('Failed to parse CSV file structure. Please check the template column headers.');
        setParsedRows([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseClientCsv = (csvText: string): ParsedRow[] => {
    const charRows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field);
        field = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(field);
        if (row.length > 0 && row.some((f) => f.trim() !== '')) {
          charRows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (field || row.length > 0) {
      row.push(field);
      if (row.some((f) => f.trim() !== '')) {
        charRows.push(row);
      }
    }

    if (charRows.length < 2) {
      throw new Error('CSV is empty');
    }

    const headers = charRows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = headers.indexOf('title');
    const captionIdx = headers.indexOf('caption');
    const scheduleAtIdx = headers.indexOf('scheduleat');
    const platformsIdx = headers.indexOf('platforms');
    const hashtagsIdx = headers.indexOf('hashtags');

    if (titleIdx === -1 || captionIdx === -1 || scheduleAtIdx === -1) {
      throw new Error('Missing column headers');
    }

    const rowsData: ParsedRow[] = [];
    for (let i = 1; i < charRows.length; i++) {
      const charRow = charRows[i];
      if (charRow.length < Math.max(titleIdx, captionIdx, scheduleAtIdx) + 1) {
        rowsData.push({
          title: '',
          caption: '',
          scheduleAt: '',
          platforms: [],
          hashtags: [],
          isValid: false,
          error: 'Missing column cells',
        });
        continue;
      }

      const title = charRow[titleIdx]?.trim() || '';
      const caption = charRow[captionIdx]?.trim() || '';
      const scheduleAtRaw = charRow[scheduleAtIdx]?.trim() || '';

      const platformsRaw = platformsIdx !== -1 ? charRow[platformsIdx]?.trim() : '';
      const platforms = platformsRaw
        ? platformsRaw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
        : ['linkedin'];

      const hashtagsRaw = hashtagsIdx !== -1 ? charRow[hashtagsIdx]?.trim() : '';
      const hashtags = hashtagsRaw
        ? hashtagsRaw.split(',').map((t) => t.trim().replace('#', '')).filter(Boolean)
        : [];

      let isValid = true;
      let error = '';

      if (!title || !caption || !scheduleAtRaw) {
        isValid = false;
        error = 'Missing required title, caption, or schedule date';
      } else {
        const scheduleDate = new Date(scheduleAtRaw);
        if (isNaN(scheduleDate.getTime())) {
          isValid = false;
          error = 'Invalid date format';
        } else if (scheduleDate <= new Date()) {
          isValid = false;
          error = 'Schedule date must be in the future';
        }
      }

      rowsData.push({
        title,
        caption,
        scheduleAt: scheduleAtRaw,
        platforms,
        hashtags,
        isValid,
        error,
      });
    }

    return rowsData;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !currentWorkspace) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessCount(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post<{ createdCount: number; errors: string[] }>(
        `/workspaces/${currentWorkspace._id}/posts/bulk`,
        formData
      );

      if (response.errors.length > 0) {
        setErrorMsg(`Bulk parsing completed with warnings:\n${response.errors.join('\n')}`);
      }

      setSuccessCount(response.createdCount);
      setParsedRows([]);
      setFile(null);
      onSuccess();
      setTimeout(() => {
        onClose();
        setSuccessCount(null);
        setErrorMsg(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit bulk upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="CSV Bulk Scheduler" className="max-w-2xl">
      <div className="space-y-4 pb-2">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Schedule multiple campaigns at once.</span>
          <button
            onClick={handleDownloadTemplate}
            className="text-cyan-400 font-semibold hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
          >
            <span>📥 Download Template CSV</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 whitespace-pre-wrap leading-relaxed font-mono max-h-[120px] overflow-y-auto">
            {errorMsg}
          </div>
        )}

        {successCount !== null && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-400 font-semibold text-center">
            🚀 Successfully scheduled {successCount} posts to your calendar!
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Dropzone area */}
          <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/10 rounded-xl p-8 flex flex-col items-center justify-center relative cursor-pointer group">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <svg className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">
              {file ? file.name : 'Select or drag your CSV file to upload'}
            </span>
            <span className="text-xs text-slate-500 mt-1">Columns required: title, caption, scheduleAt</span>
          </div>

          {/* Parsed Previews */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Row Preview ({parsedRows.length} rows parsed)</span>
                <span className="text-slate-500">Unsubmitted Drafts</span>
              </div>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 max-h-[180px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400">
                      <th className="p-2.5 font-semibold">Row</th>
                      <th className="p-2.5 font-semibold">Title</th>
                      <th className="p-2.5 font-semibold">Date</th>
                      <th className="p-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-900 hover:bg-slate-900/20 text-slate-300">
                        <td className="p-2.5 font-mono text-slate-500">{i + 2}</td>
                        <td className="p-2.5 font-semibold truncate max-w-[120px]">{row.title || 'untitled'}</td>
                        <td className="p-2.5 truncate max-w-[110px] font-mono text-slate-400">{row.scheduleAt || 'missing'}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="text-emerald-400 font-semibold">✓ Ready</span>
                          ) : (
                            <span className="text-red-400 font-semibold" title={row.error}>
                              ⚠ {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isUploading}
              disabled={isUploading || !file || parsedRows.some((r) => !r.isValid)}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
            >
              Upload & Schedule All
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
