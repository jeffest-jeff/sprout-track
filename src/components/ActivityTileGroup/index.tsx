import React, { useState, useEffect, useRef } from 'react';
import { ActivityTile } from '@/src/components/ui/activity-tile';
import { StatusBubble } from "@/src/components/ui/status-bubble";
import { SleepLogResponse, FeedLogResponse, DiaperLogResponse, NoteResponse, BathLogResponse, PumpLogResponse, PlayLogResponse, MeasurementResponse, MilestoneResponse, MedicineLogResponse, VaccineLogResponse, ActivitySettings, CustomActivityResponse } from '@/app/api/types';
import { Icon } from '@/src/components/ui/icon';
import { mdiArrowUpDown, mdiCog } from '@mdi/js';
import { defaultTileColors } from '@/src/components/ui/activity-tile/activity-tile-icon';
import { ICON_PATH_MAP } from '@/src/constants/custom-activity-icons';
import { useTheme } from '@/src/context/theme';
import { useLocalization } from '@/src/context/localization';
import './activity-tile-group.css';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/src/components/ui/dropdown-menu';

interface ActivityTileGroupProps {
  selectedBaby: {
    id: string;
    feedWarningTime?: string | number;
    diaperWarningTime?: string | number;
  } | null;
  sleepingBabies: Set<string>;
  feedingBabies?: Set<string>;
  sleepStartTime: Record<string, Date>;
  lastSleepEndTime: Record<string, Date>;
  lastFeedTime: Record<string, Date>;
  lastDiaperTime: Record<string, Date>;
  feedStartTime?: Record<string, Date>;
  updateUnlockTimer: () => void;
  onSleepClick: () => void;
  onFeedClick: () => void;
  onDiaperClick: () => void;
  onNoteClick: () => void;
  onBathClick: () => void;
  onPumpClick: () => void;
  onMeasurementClick: () => void;
  onMilestoneClick: () => void;
  onMedicineClick: () => void;
  onPlayClick?: () => void;
  onVaccineClick?: () => void;
  onCustomActivityClick?: (activity: CustomActivityResponse) => void;
}

/**
 * ActivityTileGroup component displays a group of activity tiles for tracking baby activities
 * 
 * This component is responsible for rendering the activity buttons in the log entry page
 * and displaying status bubbles with timing information.
 */
// Activity type — built-ins plus dynamic `custom-<id>` keys
type ActivityType = string;

export function ActivityTileGroup({
  selectedBaby,
  sleepingBabies,
  feedingBabies,
  sleepStartTime,
  lastSleepEndTime,
  lastFeedTime,
  lastDiaperTime,
  feedStartTime,
  updateUnlockTimer,
  onSleepClick,
  onFeedClick,
  onDiaperClick,
  onNoteClick,
  onBathClick,
  onPumpClick,
  onMeasurementClick,
  onMilestoneClick,
  onMedicineClick = () => {
    // Default implementation if not provided
    console.log('Medicine click handler not provided');
    // Open the medicine form directly if available
    const medicineForm = document.getElementById('medicine-form');
    if (medicineForm) {
      (medicineForm as HTMLElement).click();
    }
  },
  onPlayClick = () => {},
  onVaccineClick = () => {},
  onCustomActivityClick,
}: ActivityTileGroupProps) {
  const { theme } = useTheme();
  const { t } = useLocalization();
  
  // Helper function to calculate duration in minutes between two times
  const calculateDurationMinutes = (startTime: string, endTime: string): number => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.floor((end - start) / (1000 * 60));
  };
  
  // Helper function to check if duration exceeds 24 hours (1440 minutes)
  const exceeds24Hours = (startTime: Date | undefined): boolean => {
    if (!startTime) return false;
    const durationMinutes = calculateDurationMinutes(startTime.toISOString(), new Date().toISOString());
    return durationMinutes >= 1440; // 24 hours = 1440 minutes
  };
  
  if (!selectedBaby?.id) return null;

  // Define all activity types
  const allActivityTypes: ActivityType[] = ['sleep', 'feed', 'diaper', 'note', 'bath', 'pump', 'play', 'measurement', 'milestone', 'medicine', 'vaccine'];
  
  // State for visible activities and their order
  const [visibleActivities, setVisibleActivities] = useState<Set<ActivityType>>(
    () => new Set(allActivityTypes)
  );
  
  // State for activity order
  const [activityOrder, setActivityOrder] = useState<ActivityType[]>([...allActivityTypes]);
  
  // State for drag and drop
  const [draggedActivity, setDraggedActivity] = useState<ActivityType | null>(null);
  const touchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null); // Ref for touch start timeout
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Convert vertical mouse wheel events to horizontal scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // State for tracking if settings have been loaded
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // State for custom activities
  const [customActivities, setCustomActivities] = useState<CustomActivityResponse[]>([]);

  // State for per-tile background colors (keyed by activity type)
  const [tileColors, setTileColors] = useState<Record<string, string>>({});
  // Ref mirror so the save closure always reads the latest colors without needing
  // tileColors in the save-effect dependency array (which would reset the debounce).
  const tileColorsRef = useRef<Record<string, string>>({});

  // Fetch custom activities for the family
  const fetchCustomActivities = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;
    try {
      const response = await fetch('/api/custom-activity', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setCustomActivities(data.data);
      }
    } catch (error) {
      console.error('Error fetching custom activities:', error);
    }
  };

  useEffect(() => {
    fetchCustomActivities();
  }, []);

  // Re-fetch when a custom activity is created or updated elsewhere on the page
  useEffect(() => {
    const handleUpdate = () => fetchCustomActivities();
    window.addEventListener('customActivitiesUpdated', handleUpdate);
    return () => window.removeEventListener('customActivitiesUpdated', handleUpdate);
  }, []);

  // Ref to track which custom IDs were present when settings were last loaded.
  // Used to distinguish "brand new activity" from "hidden activity" on reload.
  const savedCustomIdsRef = useRef<Set<string>>(new Set());

  // Merge newly-loaded custom activities into order/visibility.
  // Only activities that were NOT part of the saved order are treated as new
  // and automatically made visible. Hidden activities stay hidden.
  useEffect(() => {
    if (!settingsLoaded || customActivities.length === 0) return;
    const customIds = customActivities.map(ca => `custom-${ca.id}`);
    // IDs not previously tracked in the saved settings → truly new activities
    const newIds = customIds.filter(id => !savedCustomIdsRef.current.has(id));
    if (newIds.length === 0) return;
    // Record them so future runs don't re-process them
    newIds.forEach(id => savedCustomIdsRef.current.add(id));
    setActivityOrder(prev => [...prev, ...newIds.filter(id => !prev.includes(id))]);
    setVisibleActivities(prev => {
      const s = new Set(prev);
      newIds.forEach(id => s.add(id));
      return s;
    });
  }, [customActivities, settingsLoaded]);

  // State for tracking the current caretaker ID
  const [caretakerId, setCaretakerId] = useState<string | null>(null);
  
  // Get caretaker ID from localStorage and listen for changes
  useEffect(() => {
    // Initialize caretaker ID from localStorage
    const storedCaretakerId = localStorage.getItem('caretakerId');
    setCaretakerId(storedCaretakerId);
    
    // Listen for changes to caretakerId in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'caretakerId' && e.newValue !== caretakerId) {
        console.log(`Caretaker ID changed in localStorage: ${caretakerId} -> ${e.newValue}`);
        setCaretakerId(e.newValue);
        setSettingsLoaded(false);
        setSettingsModified(false); // Reset modified flag when caretaker changes
      }
    };
    
    // Listen for custom caretaker change event
    const handleCaretakerChange = (e: CustomEvent) => {
      const newCaretakerId = e.detail?.caretakerId;
      if (newCaretakerId !== caretakerId) {
        console.log(`Caretaker ID changed via event: ${caretakerId} -> ${newCaretakerId}`);
        setCaretakerId(newCaretakerId);
        setSettingsLoaded(false);
        setSettingsModified(false); // Reset modified flag when caretaker changes
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('caretakerChanged', handleCaretakerChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('caretakerChanged', handleCaretakerChange as EventListener);
    };
  }, [caretakerId]);
  
  // Load activity settings from the server when caretakerId changes or settings need to be reloaded
  useEffect(() => {
    const loadActivitySettings = async () => {
      // Don't try to load settings if there's no caretakerId (user is logged out)
      if (!caretakerId) {
        console.log('No caretakerId, using default settings');
        setDefaultSettings();
        return;
      }
      
      try {
        console.log(`Loading activity settings for caretakerId: ${caretakerId}`);
        
        // Fetch activity settings from the API with the current caretakerId
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/activity-settings?caretakerId=${caretakerId}`, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        // Handle 401 Unauthorized specifically (expected when logged out)
        if (response.status === 401) {
          console.log('Not authenticated, using default settings');
          setDefaultSettings();
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data) {
            console.log(`Successfully loaded settings:`, data.data);
            
            // Get the loaded order and ensure measurement and milestone are included
            const loadedOrder = [...data.data.order] as ActivityType[];
            if (!loadedOrder.includes('measurement')) {
              // Add measurement to the end of the order if it doesn't exist
              loadedOrder.push('measurement');
            }
            if (!loadedOrder.includes('milestone')) {
              // Add milestone to the end of the order if it doesn't exist
              loadedOrder.push('milestone');
            }
            
            // Get visible activities from saved settings
            const loadedVisible = new Set(data.data.visible as ActivityType[]);
            
            // Store the original loaded settings for comparison
            const originalOrder = [...loadedOrder];
            const originalVisible = new Set(loadedVisible);
            
            // Record which custom IDs are already in the saved order so the
            // merge effect knows not to re-add hidden custom activities as visible.
            savedCustomIdsRef.current = new Set(loadedOrder.filter(id => id.startsWith('custom-')));

            // Update state with loaded settings
            setActivityOrder(loadedOrder);
            setVisibleActivities(loadedVisible);
            const loadedColors = data.data.colors || {};
            tileColorsRef.current = loadedColors;
            setTileColors(loadedColors);
            
            // Mark settings as loaded AFTER state has been updated
            setTimeout(() => {
              setSettingsLoaded(true);
              
              // Store the original settings in a ref for comparison
              // This helps us determine if settings were modified by the user
              originalOrderRef.current = originalOrder;
              originalVisibleRef.current = Array.from(originalVisible) as ActivityType[];
              
              // Reset the modified flag since we just loaded settings
              setSettingsModified(false);
            }, 0);
          } else {
            console.error('Failed to load settings:', data.error || 'Unknown error');
            // Set default settings if loading fails
            setDefaultSettings();
          }
        } else {
          console.error('Failed to load settings, server returned:', response.status);
          // Set default settings if loading fails
          setDefaultSettings();
        }
      } catch (error) {
        console.error('Error loading activity settings:', error);
        // Set default settings if loading fails
        setDefaultSettings();
      }
    };
    
    // Load settings when caretakerId changes or settingsLoaded is false
    if (!settingsLoaded) {
      loadActivitySettings();
    }
  }, [caretakerId, settingsLoaded]);
  
  // Function to set default settings
  const setDefaultSettings = () => {
    // Define all activity types
    const allActivityTypes: ActivityType[] = ['sleep', 'feed', 'diaper', 'note', 'bath', 'pump', 'play', 'measurement', 'milestone', 'medicine', 'vaccine'];
    
    // Set default order and make all activities visible by default
    setActivityOrder([...allActivityTypes]);
    setVisibleActivities(new Set(allActivityTypes));
    
    // Mark settings as loaded but not modified
    setTimeout(() => {
      setSettingsLoaded(true);
      setSettingsModified(false);
      
      // Store the default settings in the ref
      originalOrderRef.current = [...allActivityTypes];
      originalVisibleRef.current = [...allActivityTypes];
    }, 0);
  };
  
  // Refs to store the original settings for comparison
  const originalOrderRef = React.useRef<ActivityType[]>(['sleep', 'feed', 'diaper', 'note', 'bath', 'pump', 'play', 'measurement', 'milestone', 'medicine', 'vaccine']);
  const originalVisibleRef = React.useRef<string[]>(['sleep', 'feed', 'diaper', 'note', 'bath', 'pump', 'play', 'measurement', 'milestone', 'medicine', 'vaccine']);
  
  // settingsModified tracks tile color changes (order/visible are compared directly via refs)
  const [settingsModified, setSettingsModified] = useState(false);

  // Save activity settings — fires on any order/visible/color change after load
  useEffect(() => {
    if (!settingsLoaded || caretakerId === null) return;

    const orderChanged = activityOrder.length !== originalOrderRef.current.length ||
      activityOrder.some((a, i) => a !== originalOrderRef.current[i]);
    const visibleChanged = visibleActivities.size !== originalVisibleRef.current.length ||
      !Array.from(visibleActivities).every(a => originalVisibleRef.current.includes(a));

    if (!orderChanged && !visibleChanged && !settingsModified) return;

    const saveActivitySettings = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/activity-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          },
          body: JSON.stringify({
            order: [...activityOrder],
            visible: Array.from(visibleActivities),
            colors: tileColorsRef.current,
            caretakerId
          })
        });

        if (!response.ok) {
          console.error('Failed to save activity settings:', await response.text());
        } else {
          console.log('Successfully saved activity settings');
          originalOrderRef.current = [...activityOrder];
          originalVisibleRef.current = Array.from(visibleActivities);
          setSettingsModified(false);
        }
      } catch (error) {
        console.error('Error saving activity settings:', error);
      }
    };

    const timeoutId = setTimeout(saveActivitySettings, 200);
    return () => clearTimeout(timeoutId);
  }, [activityOrder, visibleActivities, settingsModified, settingsLoaded, caretakerId]);
  
  // Toggle activity visibility
  const toggleActivity = (activity: ActivityType) => {
    const newVisibleActivities = new Set(visibleActivities);
    if (newVisibleActivities.has(activity)) {
      newVisibleActivities.delete(activity);
    } else {
      newVisibleActivities.add(activity);
    }
    setVisibleActivities(newVisibleActivities);
  };

  // Move activity up in order
  const moveActivityUp = (activity: ActivityType) => {
    const index = activityOrder.indexOf(activity);
    if (index > 0) {
      const newOrder = [...activityOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setActivityOrder(newOrder);
    }
  };

  // Move activity down in order
  const moveActivityDown = (activity: ActivityType) => {
    const index = activityOrder.indexOf(activity);
    if (index < activityOrder.length - 1) {
      const newOrder = [...activityOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setActivityOrder(newOrder);
    }
  };

  // Update color for a specific activity tile
  const updateTileColor = (activity: string, color: string) => {
    const next = { ...tileColorsRef.current, [activity]: color };
    tileColorsRef.current = next;
    setTileColors(next);
    setSettingsModified(true);
  };

  // Activity display names for the menu (built-ins)
  const activityDisplayNames: Record<string, string> = {
    sleep: t('Sleep'),
    feed: t('Feed'),
    diaper: t('Diaper'),
    note: t('Note'),
    bath: t('Bath'),
    pump: t('Pump'),
    measurement: t('Measurement'),
    milestone: t('Milestone'),
    medicine: t('Medicine'),
    play: t('Activity'),
    vaccine: t('Vaccines')
  };

  const getActivityDisplayName = (activity: string): string => {
    if (activityDisplayNames[activity]) return activityDisplayNames[activity];
    if (activity.startsWith('custom-')) {
      const id = activity.replace('custom-', '');
      const ca = customActivities.find(c => c.id === id);
      return ca ? ca.name : activity;
    }
    return activity;
  };

  const firstVisibleActivity = activityOrder.find(a => visibleActivities.has(a));

  // Function to render activity tile based on type
  const renderActivityTile = (activity: ActivityType) => {
    if (!visibleActivities.has(activity)) return null;

    switch (activity) {
    case 'sleep': {
      const isLeftmost = activity === firstVisibleActivity;
      return (
        <div key="sleep" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
          <ActivityTile
            activity={{
              type: 'NAP', // Using a valid SleepType enum value
              id: 'sleep-button',
              babyId: selectedBaby.id,
              startTime: sleepStartTime[selectedBaby.id] ? sleepStartTime[selectedBaby.id].toISOString() : new Date().toISOString(),
              endTime: sleepingBabies.has(selectedBaby.id) ? null : new Date().toISOString(),
              duration: sleepingBabies.has(selectedBaby.id) ? null : 0,
              location: null,
              quality: null,
              caretakerId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null
            } as unknown as SleepLogResponse}
            title={selectedBaby?.id && sleepingBabies.has(selectedBaby.id) ? t('End Sleep') : t('Sleep')}
            variant="sleep"
            isButton={true}
            tileColor={tileColors['sleep']}
            onClick={() => {
              updateUnlockTimer();
              onSleepClick();
            }}
          />
          {selectedBaby?.id && (
            sleepingBabies.has(selectedBaby.id) ? (
              !exceeds24Hours(sleepStartTime[selectedBaby.id]) && (
                <StatusBubble
                  status="sleeping"
                  className={`overflow-visible ${isLeftmost ? 'z-[39]' : 'z-40'}`}
                  screenEdgeAware={isLeftmost}
                  durationInMinutes={0}
                  startTime={sleepStartTime[selectedBaby.id]?.toISOString()}
                />
              )
            ) : (
              !sleepStartTime[selectedBaby.id] && lastSleepEndTime[selectedBaby.id] && !exceeds24Hours(lastSleepEndTime[selectedBaby.id]) && (
                <StatusBubble
                  status="awake"
                  className={`overflow-visible ${isLeftmost ? 'z-[39]' : 'z-40'}`}
                  screenEdgeAware={isLeftmost}
                  durationInMinutes={calculateDurationMinutes(
                    lastSleepEndTime[selectedBaby.id].toISOString(),
                    new Date().toISOString()
                  )}
                  startTime={lastSleepEndTime[selectedBaby.id].toISOString()}
                  activityType="sleep"
                />
              )
            )
          )}
          </div>
        );
      }
      case 'feed': {
        const isBabyFeeding = selectedBaby?.id && feedingBabies?.has(selectedBaby.id);
        const isLeftmost = activity === firstVisibleActivity;
        return (
          <div key="feed" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                type: 'BOTTLE',
                id: 'feed-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                amount: null,
                side: null,
                food: null,
                unitAbbr: null,
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as FeedLogResponse}
              title={isBabyFeeding ? t('End Feed') : t('Feed')}
              variant="feed"
              isButton={true}
              tileColor={tileColors['feed']}
              onClick={() => {
                updateUnlockTimer();
                onFeedClick();
              }}
            />
            {isBabyFeeding ? (
              <StatusBubble
                status="feedActive"
                className={`overflow-visible ${isLeftmost ? 'z-[39]' : 'z-40'}`}
                screenEdgeAware={isLeftmost}
                durationInMinutes={0}
              />
            ) : (
              selectedBaby?.id && lastFeedTime[selectedBaby.id] && !exceeds24Hours(lastFeedTime[selectedBaby.id]) && (
                <StatusBubble
                  status="feed"
                  className={`overflow-visible ${isLeftmost ? 'z-[39]' : 'z-40'}`}
                  screenEdgeAware={isLeftmost}
                  durationInMinutes={0}
                  startTime={lastFeedTime[selectedBaby.id].toISOString()}
                  warningTime={selectedBaby.feedWarningTime as string}
                  activityType="feed"
                />
              )
            )}
          </div>
        );
      }
      case 'diaper': {
        const isLeftmost = activity === firstVisibleActivity;
        return (
          <div key="diaper" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                type: 'WET',
                id: 'diaper-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                condition: null,
                color: null,
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as DiaperLogResponse}
              title={t('Diaper')}
              variant="diaper"
              isButton={true}
              tileColor={tileColors['diaper']}
              onClick={() => {
                updateUnlockTimer();
                onDiaperClick();
              }}
            />
            {selectedBaby?.id && lastDiaperTime[selectedBaby.id] && !exceeds24Hours(lastDiaperTime[selectedBaby.id]) && (
              <StatusBubble
                status="diaper"
                className={`overflow-visible ${isLeftmost ? 'z-[39]' : 'z-40'}`}
                screenEdgeAware={isLeftmost}
                durationInMinutes={0}
                startTime={lastDiaperTime[selectedBaby.id].toISOString()}
                warningTime={selectedBaby.diaperWarningTime as string}
                activityType="diaper"
              />
            )}
          </div>
        );
      }
      case 'note':
        return (
          <div key="note" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'note-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                content: '',
                category: 'Note',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as NoteResponse}
              title={t('Note')}
              variant="note"
              isButton={true}
              tileColor={tileColors['note']}
              onClick={() => {
                updateUnlockTimer();
                onNoteClick();
              }}
            />
          </div>
        );
      case 'bath':
        return (
          <div key="bath" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'bath-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                soapUsed: false,
                shampooUsed: false,
                waterTemperature: null,
                duration: null,
                notes: '',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as BathLogResponse}
              title={t('Bath')}
              variant="bath"
              isButton={true}
              tileColor={tileColors['bath']}
              onClick={() => {
                updateUnlockTimer();
                onBathClick();
              }}
            />
          </div>
        );
      case 'pump':
        return (
          <div key="pump" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'pump-button',
                babyId: selectedBaby.id,
                startTime: new Date().toISOString(),
                endTime: null,
                duration: null,
                leftAmount: null,
                rightAmount: null,
                totalAmount: null,
                unitAbbr: null,
                notes: '',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as PumpLogResponse}
              title={t('Pump')}
              variant="pump"
              isButton={true}
              tileColor={tileColors['pump']}
              onClick={() => {
                updateUnlockTimer();
                onPumpClick();
              }}
            />
          </div>
        );
      case 'measurement':
        return (
          <div key="measurement" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'measurement-button',
                babyId: selectedBaby.id,
                date: new Date().toISOString(),
                type: 'WEIGHT',
                value: 0,
                unit: 'lb',
                notes: '',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              }as unknown as MeasurementResponse}
              title={t('Measurement')}
              variant="measurement"
              isButton={true}
              tileColor={tileColors['measurement']}
              onClick={() => {
                updateUnlockTimer();
                onMeasurementClick();
              }}
            />
          </div>
        );
      case 'milestone':
        return (
          <div key="milestone" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'milestone-button',
                babyId: selectedBaby.id,
                date: new Date().toISOString(),
                title: 'New Milestone',
                description: '',
                category: 'MOTOR',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as MilestoneResponse}
              title={t('Milestone')}
              variant="milestone"
              isButton={true}
              tileColor={tileColors['milestone']}
              onClick={() => {
                updateUnlockTimer();
                onMilestoneClick();
              }}
            />
          </div>
        );
      case 'play':
        return (
          <div key="play" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'play-button',
                babyId: selectedBaby.id,
                startTime: new Date().toISOString(),
                endTime: null,
                duration: null,
                type: 'TUMMY_TIME',
                location: null,
                activities: null,
                caretakerId: null,
                familyId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as PlayLogResponse}
              title={t('Activity')}
              variant="play"
              isButton={true}
              tileColor={tileColors['play']}
              onClick={() => {
                updateUnlockTimer();
                onPlayClick();
              }}
            />
          </div>
        );
      case 'medicine':
        return (
          <div key="medicine" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'medicine-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                doseAmount: 0,
                medicineId: '',
                medicine: {
                  id: '',
                  name: 'Medicine',
                  typicalDoseSize: 0,
                  unitAbbr: '',
                  doseMinTime: '00:30',
                  active: true
                },
                unitAbbr: '',
                notes: '',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as MedicineLogResponse}
              title={t('Medicine')}
              variant="medicine"
              isButton={true}
              tileColor={tileColors['medicine']}
              onClick={() => {
                updateUnlockTimer();
                onMedicineClick();
              }}
            />
          </div>
        );
      case 'vaccine':
        return (
          <div key="vaccine" className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
            <ActivityTile
              activity={{
                id: 'vaccine-button',
                babyId: selectedBaby.id,
                time: new Date().toISOString(),
                vaccineName: 'Vaccine',
                doseNumber: null,
                site: null,
                notes: '',
                caretakerId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
              } as unknown as VaccineLogResponse}
              title={t('Vaccines')}
              variant="vaccine"
              isButton={true}
              tileColor={tileColors['vaccine']}
              onClick={() => {
                updateUnlockTimer();
                onVaccineClick();
              }}
            />
          </div>
        );
      default: {
        if (activity.startsWith('custom-')) {
          const caId = activity.replace('custom-', '');
          const ca = customActivities.find(c => c.id === caId);
          if (!ca) return null;
          return (
            <div key={activity} className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
              <ActivityTile
                activity={{ id: activity, babyId: selectedBaby.id, time: new Date().toISOString(), content: '', category: 'Custom', caretakerId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null } as any}
                title={ca.name}
                variant="default"
                isButton={true}
                icon={
                  ca.icon.startsWith('mdi') && ICON_PATH_MAP[ca.icon] ? (
                    <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: ca.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon path={ICON_PATH_MAP[ca.icon]} size="2.5rem" color="white" />
                    </div>
                  ) : (
                    <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: ca.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '2rem', lineHeight: '1' }}>{ca.icon}</span>
                    </div>
                  )
                }
                onClick={() => { updateUnlockTimer(); onCustomActivityClick?.(ca); }}
              />
            </div>
          );
        }
        return null;
      }
    }
  };

  return (
    <div className="activity-tile-group">
      <div ref={scrollContainerRef} className="flex overflow-x-auto border-0 no-scrollbar snap-x snap-mandatory relative p-2 gap-1">
        {/* Render activity tiles based on order and visibility */}
        {activityOrder.map(activity => renderActivityTile(activity))}

        {/* Configure Button for customizing activity tiles */}
        <div className="relative w-[82px] min-h-24 flex-shrink-0 snap-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full h-full bg-transparent border-0 cursor-pointer p-0 m-0">
              <ActivityTile
                activity={{
                  id: 'configure-button',
                  babyId: selectedBaby.id,
                  time: new Date().toISOString(),
                  content: '',
                  category: 'Configure',
                  caretakerId: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  deletedAt: null
                } as unknown as NoteResponse}
                title={t('Configure')}
                variant="default"
                isButton={true}
                icon={
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon path={mdiCog} size="2.5rem" color="white" />
                  </div>
                }
              />
            </button>
          </DropdownMenuTrigger>
          {/* Apply scrolling directly to DropdownMenuContent */}
          <DropdownMenuContent
            align="end"
            className="p-0"
            avoidCollisions={true}
            collisionPadding={10}
            style={{ maxHeight: 'calc(var(--radix-dropdown-menu-content-available-height, 80vh) - 20px)', overflowY: 'auto' }}
          >
            <div className="p-1">
            {/* Combined Visibility and Reordering Options */}
            {activityOrder.map((activity, index) => (
                <div
                key={`order-${activity}`} 
                className={`flex items-center px-2 py-2 hover:bg-gray-50 hover-background rounded-md my-1 ${draggedActivity === activity ? 'opacity-50 bg-gray-100 draggable-background' : ''} ${draggedActivity && draggedActivity !== activity ? 'hover:bg-emerald-50 hover-emerald' : ''} activity-dropdown-item`}
                draggable="true"
                onDragStart={(e) => {
                  // Original onDragStart logic
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', activity);
                  setDraggedActivity(activity);
                  
                  // Capture a reference to the element for visual feedback (desktop)
                  const element = e.currentTarget as HTMLElement;
                  // Add a delay to make sure the drag effect is visible
                  setTimeout(() => {
                    if (element) {
                      element.classList.add('opacity-50', 'bg-gray-100', 'draggable-background');
                    }
                  }, 0); 
                }}
                onDragEnd={(e) => {
                  setDraggedActivity(null);
                  setDraggedActivity(null);
                  // Remove all highlights (including dark mode)
                  document.querySelectorAll('[draggable="true"]').forEach(el => {
                    el.classList.remove('bg-emerald-50', 'draggable-highlight', 'opacity-50', 'bg-gray-100', 'draggable-background');
                  });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (draggedActivity && draggedActivity !== activity) {
                    e.currentTarget.classList.add('bg-emerald-50', 'draggable-highlight');
                  }
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-emerald-50', 'draggable-highlight');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-emerald-50', 'draggable-highlight');
                  
                  const droppedActivity = e.dataTransfer.getData('text/plain') as ActivityType;
                  
                  if (droppedActivity && droppedActivity !== activity) {
                    const newOrder = [...activityOrder];
                    const draggedIndex = newOrder.indexOf(droppedActivity);
                    const targetIndex = newOrder.indexOf(activity);
                    
                    // Remove the dragged item
                    newOrder.splice(draggedIndex, 1);
                    // Insert it at the new position
                    newOrder.splice(targetIndex, 0, droppedActivity);
                    
                    setActivityOrder(newOrder);
                  }
                }}
                // Touch event handlers for mobile support
                onTouchStart={(e) => {
                  // Store the initial touch position
                  const touch = e.touches[0];
                  const targetElement = e.currentTarget as HTMLElement; // Cast here
                  targetElement.setAttribute('data-touch-start-x', touch.clientX.toString());
                  targetElement.setAttribute('data-touch-start-y', touch.clientY.toString());

                  // Clear any previous timeout
                  if (touchTimeoutRef.current) {
                    clearTimeout(touchTimeoutRef.current);
                  }

                  // Set a timeout ONLY to set the drag state. Visuals handled by className.
                  touchTimeoutRef.current = setTimeout(() => {
                    setDraggedActivity(activity); 
                    touchTimeoutRef.current = null; // Clear ref after execution
                  }, 150); 
                }}
                onTouchMove={(e) => {
                  if (!draggedActivity) return;
                                    
                  // Find the element under the touch point
                  const touch = e.touches[0];
                  const elementsAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
                  
                  // Find the first draggable element in the elements under the touch
                  const touchedElement = elementsAtTouch.find(el => 
                    el.getAttribute('draggable') === 'true' && 
                    el.getAttribute('data-key') && 
                    el.getAttribute('data-key') !== `order-${draggedActivity}`
                  ) as HTMLElement | undefined;
                  
                  // Remove highlight from all items (including dark mode)
                  document.querySelectorAll('[draggable="true"]').forEach(el => {
                    if (el !== e.currentTarget) {
                      el.classList.remove('bg-emerald-50', 'draggable-highlight');
                    }
                  });
                  
                  // Add highlight to the element under touch (including dark mode)
                  if (touchedElement) {
                    touchedElement.classList.add('bg-emerald-50', 'draggable-highlight');
                  }
                }}
                onTouchEnd={(e) => {
                  // Clear the timeout if touch ends before it fires
                  if (touchTimeoutRef.current) {
                    clearTimeout(touchTimeoutRef.current);
                    touchTimeoutRef.current = null;
                  }
                  
                  // Only proceed with drop logic if we actually entered drag mode
                  if (!draggedActivity || draggedActivity !== activity) {
                     // If not dragging this item, reset highlights and state just in case
                     document.querySelectorAll('[draggable="true"]').forEach(el => {
                       el.classList.remove('bg-emerald-50', 'draggable-highlight', 'opacity-50', 'bg-gray-100', 'draggable-background');
                     });
                     if (draggedActivity === activity) setDraggedActivity(null); // Reset if it was this item briefly
                     return; 
                  }
                  
                  // Find the element under the touch point
                  const touch = e.changedTouches[0];
                  const elementsAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
                  
                  // Find the first draggable element in the elements under the touch
                  const touchedElement = elementsAtTouch.find(el => 
                    el.getAttribute('draggable') === 'true' && 
                    el.getAttribute('data-key') && 
                    el.getAttribute('data-key') !== `order-${draggedActivity}`
                  ) as HTMLElement | undefined;
                  
                  if (touchedElement) {
                    // Get the activity from the data-key attribute
                    const key = touchedElement.getAttribute('data-key');
                    if (key && key.startsWith('order-')) {
                      const touchedActivity = key.replace('order-', '') as ActivityType;
                      
                      if (touchedActivity !== draggedActivity) {
                        const newOrder = [...activityOrder];
                        const draggedIndex = newOrder.indexOf(draggedActivity);
                        const targetIndex = newOrder.indexOf(touchedActivity);
                        
                        // Remove the dragged item
                        newOrder.splice(draggedIndex, 1);
                        // Insert it at the new position
                        newOrder.splice(targetIndex, 0, draggedActivity);
                        
                        setActivityOrder(newOrder);
                      }
                    }
                  }
                  
                  // Remove all highlights (including self if needed)
                  document.querySelectorAll('[draggable="true"]').forEach(el => {
                    el.classList.remove('bg-emerald-50', 'draggable-highlight', 'opacity-50', 'bg-gray-100', 'draggable-background');
                  });
                  
                  setDraggedActivity(null); // End drag state
                }}
                onTouchCancel={(e) => {
                  // Clear the timeout if touch is cancelled
                  if (touchTimeoutRef.current) {
                    clearTimeout(touchTimeoutRef.current);
                    touchTimeoutRef.current = null;
                  }
                  
                  // Remove all highlights
                  document.querySelectorAll('[draggable="true"]').forEach(el => {
                    el.classList.remove('bg-emerald-50', 'draggable-highlight', 'opacity-50', 'bg-gray-100', 'draggable-background');
                  });
                  
                  setDraggedActivity(null);
                }}
                data-key={`order-${activity}`}
              >
                <button
                  className="p-1 rounded-full hover:bg-gray-100 hover-background cursor-grab active:cursor-grabbing mr-2 activity-dropdown-item-drag-button"
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  aria-label={`${t('Drag to reorder')} ${activityDisplayNames[activity]}`}
                  title={t('Drag to reorder')}
                >
                  <Icon path={mdiArrowUpDown} size="1rem" className="text-gray-500 icon-text" />
                </button>
                <label
                  className="relative mr-2 cursor-pointer flex-shrink-0"
                  title={t('Change tile color')}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      backgroundColor: tileColors[activity] || (defaultTileColors as Record<string, string>)[activity] || '#6b7280',
                      border: '2px solid rgba(0,0,0,0.15)',
                    }}
                  />
                  <input
                    type="color"
                    value={tileColors[activity] || (defaultTileColors as Record<string, string>)[activity] || '#6b7280'}
                    onChange={(e) => updateTileColor(activity, e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
                <DropdownMenuCheckboxItem
                  checked={visibleActivities.has(activity)}
                  onCheckedChange={() => toggleActivity(activity)}
                  className="flex-grow"
                >
                  {getActivityDisplayName(activity)}
                </DropdownMenuCheckboxItem>
              </div>
            ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </div>
  );
}
