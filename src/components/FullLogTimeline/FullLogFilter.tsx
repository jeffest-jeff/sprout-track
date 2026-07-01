import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import {
  mdiMoonWaningCrescent,
  mdiPencil,
  mdiChevronDown,
  mdiBathtub,
  mdiMotherNurse,
  mdiTrophy,
  mdiRuler,
  mdiBottleTonicPlus,
  mdiBabyFaceOutline,
  mdiNeedle,
  mdiDiaperOutline,
  mdiBabyBottle,
} from '@mdi/js';
import { FilterType, FullLogFilterProps } from './full-log-timeline.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/src/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import { Calendar } from '@/src/components/ui/calendar';
import { cn } from '@/src/lib/utils';
import { useLocalization } from '@/src/context/localization';
import { useTimezone } from '@/app/context/timezone';
import { formatDateDisplay } from '@/src/utils/dateFormat';

/**
 * FullLogFilter Component
 * 
 * Displays filter controls for the full log timeline, including:
 * - Date range selection
 * - Quick date range filters
 * - Activity type filtering
 */
const FullLogFilter: React.FC<FullLogFilterProps> = ({
  activeFilter,
  onFilterChange,
  startDate,
  endDate,
  onDateRangeChange,
  onQuickFilter,
  enableBreastMilkTracking = true,
}) => {
  const { t } = useLocalization();
  const { dateFormat } = useTimezone();

  // State for popover open/close
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Define filter types and their icons
  const filterOptions = [
    { type: 'sleep', icon: <Icon path={mdiMoonWaningCrescent} size="1rem" />, labelKey: 'Sleep' },
    { type: 'feed', icon: <Icon path={mdiBabyBottle} size="1rem" />, labelKey: 'Feed' },
    { type: 'diaper', icon: <Icon path={mdiDiaperOutline} size="1rem" />, labelKey: 'Diaper' },
    { type: 'bath', icon: <Icon path={mdiBathtub} size="1rem" />, labelKey: 'Bath' },
    { type: 'note', icon: <Icon path={mdiPencil} size="1rem" />, labelKey: 'Note' },
    { type: 'pump', icon: <Icon path={mdiMotherNurse} size="1rem" />, labelKey: 'Pump' },
    ...(enableBreastMilkTracking ? [{ type: 'breast-milk-adjustment' as const, icon: <Icon path={mdiMotherNurse} size="1rem" />, labelKey: 'Milk Adjust' as const }] : []),
    { type: 'milestone', icon: <Icon path={mdiTrophy} size="1rem" />, labelKey: 'Milestone' },
    { type: 'measurement', icon: <Icon path={mdiRuler} size="1rem" />, labelKey: 'Measurement' },
    { type: 'medicine', icon: <Icon path={mdiBottleTonicPlus} size="1rem" />, labelKey: 'Medicine' },
    { type: 'play', icon: <Icon path={mdiBabyFaceOutline} size="1rem" />, labelKey: 'Activity' },
    { type: 'vaccine', icon: <Icon path={mdiNeedle} size="1rem" />, labelKey: 'Vaccine' },
  ] as const;

  // Format date range for display
  const formatDateRange = () => {
    return `${formatDateDisplay(startDate, dateFormat)} - ${formatDateDisplay(endDate, dateFormat)}`;
  };

  return (
    <div className="flex flex-wrap justify-between py-3 items-center text-sm font-medium">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:mb-0">
        {/* Date Range Selector */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-sm font-medium text-white hover:bg-transparent hover:text-white/90"
            >
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            <Calendar
              mode="range"
              rangeFrom={startDate}
              rangeTo={endDate}
              onRangeChange={(from, to) => {
                const newStartDate = from ? new Date(from) : null;
                if (newStartDate) newStartDate.setHours(0, 0, 0, 0);

                const newEndDate = to ? new Date(to) : null;
                if (newEndDate) newEndDate.setHours(23, 59, 59, 999);

                // Handle state update based on selection phase
                if (newStartDate && !newEndDate) {
                  // First click: 'to' is null. Pass newStartDate for both to satisfy type.
                  // The Calendar component internally knows 'to' is null for rendering.
                  onDateRangeChange(newStartDate, newStartDate); 
                } else if (newStartDate && newEndDate) {
                  // Second click: Both dates are valid. Update parent state fully.
                  onDateRangeChange(newStartDate, newEndDate);
                  
                  // Close the popover only when the range is complete (second click)
                  setTimeout(() => {
                    setCalendarOpen(false);
                  }, 500);
                } else if (!newStartDate && !newEndDate) {
                  // Range reset case (e.g., clicking same day twice)
                  // Call parent with original dates to reflect no change / reset state
                  // (Assuming parent handles this appropriately or we adjust later)
                  onDateRangeChange(startDate, endDate); 
                }
                // If newStartDate is null (shouldn't happen with current Calendar logic), do nothing.
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter(2)}
            className="h-7 px-2 text-white hover:bg-transparent hover:text-white/90"
          >
            {t('2 Days')}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter(7)}
            className="h-7 px-2 text-white hover:bg-transparent hover:text-white/90"
          >
            {t('7 Days')}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickFilter(30)}
            className="h-7 px-2 text-white hover:bg-transparent hover:text-white/90"
          >
            {t('30 Days')}
          </Button>
        </div>
      </div>
      
      {/* Filters Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 h-7 text-sm font-medium text-white hover:bg-transparent hover:text-white/90 p-0"
          >
            {t('Filters')} <Icon path={mdiChevronDown} size="1rem" className="ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {filterOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.type}
              checked={activeFilter === option.type}
              onCheckedChange={() => onFilterChange(activeFilter === option.type ? null : option.type as FilterType)}
              className="flex items-center gap-2"
            >
              <span className="flex items-center justify-center w-6">{option.icon}</span>
              <span>{t(option.labelKey)}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FullLogFilter;
