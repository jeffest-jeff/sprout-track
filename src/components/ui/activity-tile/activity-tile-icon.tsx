import React from 'react';
import { Icon } from '@/src/components/ui/icon';
import {
  mdiMoonWaningCrescent, mdiPencil, mdiMotherNurse, mdiTrophy,
  mdiBabyFaceOutline, mdiRun, mdiNeedle, mdiDiaperOutline, mdiBabyBottle,
  mdiBathtub, mdiBottleTonicPlus, mdiRuler, mdiStar,
} from '@mdi/js';
import { cn } from "@/src/lib/utils";
import { activityTileStyles as styles } from './activity-tile.styles';
import { ActivityTileIconProps, ActivityTileVariant, ActivityType } from './activity-tile.types';
import { getActivityVariant } from './activity-tile-utils';

const BUTTON_SIZE = '2.5rem';
const CIRCLE_SIZE = '3.5rem';

export const defaultTileColors: Record<ActivityTileVariant, string> = {
  sleep:       '#6b7280',
  feed:        '#2563eb',
  diaper:      '#0d9488',
  note:        '#d97706',
  bath:        '#ea580c',
  pump:        '#9333ea',
  play:        '#fb923c',
  measurement: '#4f46e5',
  milestone:   '#db2777',
  medicine:    '#dc2626',
  vaccine:     '#b91c1c',
  default:     '#1f2937',
};

function iconCircle(iconNode: React.ReactNode, color: string): React.ReactNode {
  return (
    <div style={{
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: '50%',
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {iconNode}
    </div>
  );
}

function getButtonIcon(variant: ActivityTileVariant, tileColor?: string): React.ReactNode {
  const color = tileColor || defaultTileColors[variant];
  switch (variant) {
    case 'sleep':
      return iconCircle(<Icon path={mdiMoonWaningCrescent} size={BUTTON_SIZE} color="white" />, color);
    case 'feed':
      return iconCircle(<Icon path={mdiBabyBottle} size={BUTTON_SIZE} color="white" />, color);
    case 'diaper':
      return iconCircle(<Icon path={mdiDiaperOutline} size={BUTTON_SIZE} color="white" />, color);
    case 'note':
      return iconCircle(<Icon path={mdiPencil} size={BUTTON_SIZE} color="white" />, color);
    case 'bath':
      return iconCircle(<Icon path={mdiBathtub} size={BUTTON_SIZE} color="white" />, color);
    case 'pump':
      return iconCircle(<Icon path={mdiMotherNurse} size={BUTTON_SIZE} color="white" />, color);
    case 'measurement':
      return iconCircle(<Icon path={mdiRuler} size={BUTTON_SIZE} color="white" />, color);
    case 'milestone':
      return iconCircle(<Icon path={mdiTrophy} size={BUTTON_SIZE} color="white" />, color);
    case 'medicine':
      return iconCircle(<Icon path={mdiBottleTonicPlus} size={BUTTON_SIZE} color="white" />, color);
    case 'vaccine':
      return iconCircle(<Icon path={mdiNeedle} size={BUTTON_SIZE} color="white" />, color);
    case 'play':
      return iconCircle(
        <div className="relative" style={{ width: '2.5rem', height: '2.5rem' }}>
          <Icon path={mdiBabyFaceOutline} size="1.4rem" color="white" className="absolute top-0 left-0" />
          <Icon path={mdiRun} size="1.4rem" color="white" className="absolute bottom-0 right-0" />
        </div>,
        color
      );
    default:
      return iconCircle(<Icon path={mdiStar} size={BUTTON_SIZE} color="white" />, color);
  }
}

/**
 * ActivityTileIcon component displays the appropriate icon based on activity type
 */
export function ActivityTileIcon({
  activity,
  className,
  variant: variantProp,
  isButton = false,
  tileColor,
}: ActivityTileIconProps & { variant?: ActivityTileVariant; isButton?: boolean; tileColor?: string }) {
  const variant = variantProp || getActivityVariant(activity);

  let icon: React.ReactNode = null;

  if (isButton) {
    icon = getButtonIcon(variant, tileColor);
  } else {
    if ('type' in activity) {
      if ('duration' in activity) {
        icon = <Icon path={mdiMoonWaningCrescent} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
      } else if ('amount' in activity) {
        icon = <Icon path={mdiBabyBottle} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
      } else if ('condition' in activity) {
        icon = <Icon path={mdiDiaperOutline} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
      }
    } else if ('activities' in activity && 'startTime' in activity && 'type' in activity &&
      ['TUMMY_TIME', 'INDOOR_PLAY', 'OUTDOOR_PLAY', 'WALK', 'CUSTOM'].includes((activity as any).type)) {
      icon = (
        <div className="relative" style={{ width: '4rem', height: '4rem' }}>
          <Icon path={mdiBabyFaceOutline} size="2rem" className="absolute top-0 left-0" style={{ color: '#F3C4A2' }} />
          <Icon path={mdiRun} size="2rem" className="absolute bottom-0 right-0" style={{ color: '#F3C4A2' }} />
        </div>
      );
    } else if ('vaccineName' in activity) {
      icon = <Icon path={mdiNeedle} size="1rem" style={{ color: '#EF4444' }} />;
    } else if ('content' in activity) {
      icon = <Icon path={mdiPencil} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    } else if ('leftAmount' in activity || 'rightAmount' in activity) {
      icon = <Icon path={mdiMotherNurse} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    } else if ('title' in activity && 'category' in activity) {
      icon = <Icon path={mdiTrophy} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    }
  }

  return (
    <div className={cn(
      styles.iconContainer.base,
      styles.iconContainer.variants[variant],
      className
    )}>
      {icon}
    </div>
  );
}
