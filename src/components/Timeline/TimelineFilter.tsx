import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import {
  mdiMoonWaningCrescent,
  mdiPencil,
  mdiChevronLeft,
  mdiChevronRight,
  mdiBathtub,
  mdiChevronDown,
  mdiMotherNurse,
  mdiTrophy,
  mdiRuler,
  mdiBottleTonicPlus,
  mdiDiaperOutline,
  mdiBabyBottle,
} from '@mdi/js';
import { FilterType, TimelineFilterProps } from './types';
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
import { useLocalization } from '@/src/context/localization';

const TimelineFilter = ({
  selectedDate,
  activeFilter,
  onDateChange,
  onDateSelection,
  onFilterChange,
  enableBreastMilkTracking = true,
}: TimelineFilterProps) => {
  

  const { t } = useLocalization();  

  // State for popover open/close
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Define filter types and their icons
  const filterOptions = [
    { type: 'sleep', icon: <Icon path={mdiMoonWaningCrescent} size="1rem" />, label: t('Sleep') },
    { type: 'feed', icon: <Icon path={mdiBabyBottle} size="1rem" />, label: t('Feed') },
    { type: 'diaper', icon: <Icon path={mdiDiaperOutline} size="1rem" />, label: t('Diaper') },
    { type: 'bath', icon: <Icon path={mdiBathtub} size="1rem" />, label: t('Bath') },
    { type: 'note', icon: <Icon path={mdiPencil} size="1rem" />, label: t('Note') },
    { type: 'pump', icon: <Icon path={mdiMotherNurse} size="1rem" />, label: t('Pump') },
    ...(enableBreastMilkTracking ? [{ type: 'breast-milk-adjustment' as const, icon: <Icon path={mdiMotherNurse} size="1rem" />, label: t('Milk Adjust') }] : []),
    { type: 'milestone', icon: <Icon path={mdiTrophy} size="1rem" />, label: t('Milestone') },
    { type: 'measurement', icon: <Icon path={mdiRuler} size="1rem" />, label: t('Measurement') },
    { type: 'medicine', icon: <Icon path={mdiBottleTonicPlus} size="1rem" />, label: t('Medicine') },
  ] as const;



  return (
    <div className="flex justify-between px-6 py-3 items-center text-sm font-medium">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(-1)}
          className="h-7 w-7 text-white hover:bg-transparent hover:text-white/90 p-0 -ml-2"
          aria-label={t("Previous day")}

        >
          <Icon path={mdiChevronLeft} size="1rem" />
        </Button>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-sm font-medium text-white hover:bg-transparent hover:text-white/90"
            >
              {selectedDate.toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit',
                year: 'numeric'
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            <Calendar
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  date.setHours(0, 0, 0, 0);
                  onDateSelection(date);
                  setCalendarOpen(false); // Close the popover after selection
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(1)}
          className="h-7 w-7 text-white hover:bg-transparent hover:text-white/90 p-0"
          aria-label={t("Next day")}

        >
          <Icon path={mdiChevronRight} size="1rem" />
        </Button>
      </div>
      
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
              <span>{option.label}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};



export default TimelineFilter;
