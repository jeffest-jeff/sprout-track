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

const BUTTON_SIZE = '3.5rem';

function getButtonIcon(variant: ActivityTileVariant): React.ReactNode {
  const color = styles.icon.variants[variant];
  switch (variant) {
    case 'sleep':       return <Icon path={mdiMoonWaningCrescent} size={BUTTON_SIZE} className={color} />;
    case 'feed':        return <Icon path={mdiBabyBottle} size={BUTTON_SIZE} className={color} />;
    case 'diaper':      return <Icon path={mdiDiaperOutline} size={BUTTON_SIZE} className={color} />;
    case 'note':        return <Icon path={mdiPencil} size={BUTTON_SIZE} className={color} />;
    case 'bath':        return <Icon path={mdiBathtub} size={BUTTON_SIZE} className={color} />;
    case 'pump':        return <Icon path={mdiMotherNurse} size={BUTTON_SIZE} className={color} />;
    case 'measurement': return <Icon path={mdiRuler} size={BUTTON_SIZE} className={color} />;
    case 'milestone':   return <Icon path={mdiTrophy} size={BUTTON_SIZE} className={color} />;
    case 'medicine':    return <Icon path={mdiBottleTonicPlus} size={BUTTON_SIZE} className={color} />;
    case 'vaccine':     return <Icon path={mdiNeedle} size={BUTTON_SIZE} className={color} />;
    case 'play':
      return (
        <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
          <Icon path={mdiBabyFaceOutline} size="2rem" className={cn(color, "absolute top-0 left-0")} />
          <Icon path={mdiRun} size="2rem" className={cn(color, "absolute bottom-0 right-0")} />
        </div>
      );
    default:            return <Icon path={mdiStar} size={BUTTON_SIZE} className={color} />;
  }
}

/**
 * ActivityTileIcon component displays the appropriate icon based on activity type
 */
export function ActivityTileIcon({
  activity,
  className,
  variant: variantProp,
  isButton = false
}: ActivityTileIconProps & { variant?: ActivityTileVariant; isButton?: boolean }) {
  const variant = variantProp || getActivityVariant(activity);

  let icon: React.ReactNode = null;

  if (isButton) {
    icon = getButtonIcon(variant);
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
