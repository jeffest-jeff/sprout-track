import React from 'react';
import {
  mdiMoonWaningCrescent,
  mdiPencil,
  mdiTrophy,
  mdiRun,
  mdiSyringe,
  mdiMotherNurse,
  mdiBabyBottle,
  mdiDiaperOutline,
} from '@mdi/js';
import { Icon } from '@/src/components/ui/icon';
import { cn } from "@/src/lib/utils";
import { activityTileStyles as styles } from './activity-tile.styles';
import { ActivityTileIconProps, ActivityTileVariant, ActivityType } from './activity-tile.types';
import { getActivityVariant } from './activity-tile-utils';

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

  let icon = null;

  // For buttons, always use the image icons
  if (isButton && styles.icon.defaultIcons[variant]) {
    icon = <img
      src={styles.icon.defaultIcons[variant]}
      alt={variant}
      width={64}
      height={64}
      className={cn("object-contain", styles.icon.base)}
    />;
  }
  // For timeline view, use MDI icons (smaller icons)
  else if (!isButton) {
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
      icon = <Icon path={mdiRun} size="1.5rem" color="#F3C4A2" />;
    } else if ('vaccineName' in activity) {
      icon = <Icon path={mdiSyringe} size="1rem" className="text-red-500" />;
    } else if ('content' in activity) {
      icon = <Icon path={mdiPencil} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    } else if ('leftAmount' in activity || 'rightAmount' in activity) {
      icon = <Icon path={mdiMotherNurse} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    } else if ('title' in activity && 'category' in activity) {
      icon = <Icon path={mdiTrophy} className={cn(styles.icon.base, styles.icon.variants[variant])} />;
    }
  }

  // If no icon is determined and we have a default icon for this variant, use it
  if (!icon && styles.icon.defaultIcons[variant]) {
    icon = <img
      src={styles.icon.defaultIcons[variant]}
      alt={variant}
      width={64}
      height={64}
      className={cn("object-contain", styles.icon.base)}
    />;
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
