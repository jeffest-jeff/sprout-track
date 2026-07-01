import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { mdiDownload, mdiLoading } from '@mdi/js';
import { useLocalization } from '@/src/context/localization';
import { useTimezone } from '@/app/context/timezone';
import { FilterType } from './full-log-timeline.types';

interface FullLogExportButtonProps {
  babyId: string;
  startDate: Date;
  endDate: Date;
  activeFilter: FilterType;
}

const FullLogExportButton: React.FC<FullLogExportButtonProps> = ({
  babyId,
  startDate,
  endDate,
  activeFilter,
}) => {
  const { t, language } = useLocalization();
  const { userTimezone } = useTimezone();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const adjustedStart = new Date(startDate);
      adjustedStart.setHours(0, 0, 0, 0);
      const adjustedEnd = new Date(endDate);
      adjustedEnd.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        babyId,
        startDate: adjustedStart.toISOString(),
        endDate: adjustedEnd.toISOString(),
        format,
        timezone: userTimezone,
        language: language || 'en',
      });

      if (activeFilter) {
        params.set('filter', activeFilter);
      }

      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/timeline/export?${params.toString()}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Export failed:', errorData.error || response.statusText);
        return;
      }

      // Download the file
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `activity-log.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-1 h-7 text-sm font-medium text-white hover:bg-transparent hover:text-white/90 p-0"
      >
        {isExporting ? (
          <Icon path={mdiLoading} size="1rem" spin />
        ) : (
          <Icon path={mdiDownload} size="1rem" />
        )}
        {t('Export')}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[140px]">
          <button
            onClick={() => handleExport('csv')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t('Export CSV')}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t('Export XLSX')}
          </button>
        </div>
      )}
    </div>
  );
};

export default FullLogExportButton;
