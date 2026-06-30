'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@/src/components/ui/icon';
import { Input } from '@/src/components/ui/input';
import {
  CUSTOM_ACTIVITY_ICON_GROUPS,
  ALL_CUSTOM_ACTIVITY_ICONS,
  MdiIconEntry,
} from '@/src/constants/custom-activity-icons';
import { mdiMagnify } from '@mdi/js';
import './icon-picker.css';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  accentColor?: string;
}

export function IconPicker({ value, onChange, accentColor }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(CUSTOM_ACTIVITY_ICON_GROUPS[0].label);

  const filteredIcons = useMemo<MdiIconEntry[]>(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_CUSTOM_ACTIVITY_ICONS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [search]);

  const isSearching = search.trim().length > 0;
  const displayedIcons = isSearching
    ? filteredIcons
    : CUSTOM_ACTIVITY_ICON_GROUPS.find((g) => g.label === activeGroup)?.icons ?? [];

  return (
    <div className="icon-picker-root space-y-3">
      {/* Search */}
      <div className="relative">
        <Icon
          path={mdiMagnify}
          size="1rem"
          className="icon-picker-search-icon absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
          className="pl-8"
        />
      </div>

      {/* Category tabs — hidden when searching */}
      {!isSearching && (
        <div className="flex gap-1 flex-wrap">
          {CUSTOM_ACTIVITY_ICON_GROUPS.map((group) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(group.label)}
              className={`icon-picker-tab px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeGroup === group.label ? 'icon-picker-tab-active' : 'icon-picker-tab-inactive'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {/* Icon grid */}
      <div className="icon-picker-grid grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {displayedIcons.map((icon) => {
          const isSelected = value === icon.name;
          return (
            <button
              key={icon.name}
              type="button"
              title={icon.label}
              onClick={() => onChange(icon.name)}
              className={`icon-picker-cell flex items-center justify-center rounded p-1.5 transition-colors ${
                isSelected ? 'icon-picker-cell-selected' : 'icon-picker-cell-unselected'
              }`}
              style={isSelected && accentColor ? { backgroundColor: accentColor + '33', borderColor: accentColor } : undefined}
              aria-pressed={isSelected}
              aria-label={icon.label}
            >
              <Icon path={icon.path} size="1.25rem" className={isSelected ? 'icon-picker-icon-selected' : 'icon-picker-icon'} />
            </button>
          );
        })}
        {isSearching && filteredIcons.length === 0 && (
          <p className="col-span-8 text-center text-sm text-gray-400 py-4">No icons found</p>
        )}
      </div>

      {/* Selected preview */}
      {value && value.startsWith('mdi') && (
        <div className="flex items-center gap-2 icon-picker-preview-row">
          <span className="text-xs text-gray-500">Selected:</span>
          {(() => {
            const entry = ALL_CUSTOM_ACTIVITY_ICONS.find((i) => i.name === value);
            return entry ? (
              <span className="flex items-center gap-1 text-sm">
                <Icon path={entry.path} size="1rem" />
                {entry.label}
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
