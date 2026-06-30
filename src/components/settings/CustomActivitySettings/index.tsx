'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CustomActivityResponse } from '@/app/api/types';
import { Button } from '@/src/components/ui/button';
import { Switch } from '@/src/components/ui/switch';
import { Icon } from '@/src/components/ui/icon';
import { mdiPlus, mdiPencil, mdiTrashCan } from '@mdi/js';
import { ICON_PATH_MAP } from '@/src/constants/custom-activity-icons';
import { useToast } from '@/src/components/ui/toast';
import { useLocalization } from '@/src/context/localization';
import CustomActivityModal from '@/src/components/modals/CustomActivityModal';
import './custom-activity-settings.css';

interface BabyOption {
  id: string;
  firstName: string;
}

interface CustomActivitySettingsProps {
  babies?: BabyOption[];
}

function authHeaders() {
  const authToken = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : '',
  };
}

export default function CustomActivitySettings({ babies = [] }: CustomActivitySettingsProps) {
  const { t } = useLocalization();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<CustomActivityResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomActivityResponse | null>(null);
  // babyId -> Set of visible custom activity keys ("custom-<id>")
  const [babyVisibility, setBabyVisibility] = useState<Record<string, string[]>>({});

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/custom-activity', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setActivities(data.data);
    } catch (error) {
      console.error('Error fetching custom activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBabyVisibility = useCallback(async () => {
    const result: Record<string, string[]> = {};
    for (const baby of babies) {
      try {
        const res = await fetch(`/api/activity-settings?babyId=${baby.id}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) result[baby.id] = data.data.visible || [];
      } catch { /* ignore */ }
    }
    setBabyVisibility(result);
  }, [babies]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (babies.length > 0) fetchBabyVisibility();
  }, [babies, fetchBabyVisibility]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('Delete Activity') + '?')) return;
    try {
      await fetch(`/api/custom-activity?id=${id}`, { method: 'DELETE', headers: authHeaders() });
      fetchActivities();
    } catch (error) {
      showToast({ variant: 'error', title: 'Error', message: 'Failed to delete', duration: 4000 });
    }
  };

  // A baby's `visible` list is empty => all visible (no restriction).
  const isVisibleForBaby = (babyId: string, activityId: string): boolean => {
    const list = babyVisibility[babyId];
    if (!list || list.length === 0) return true;
    return list.includes(`custom-${activityId}`);
  };

  const toggleBabyVisibility = async (babyId: string, activityId: string) => {
    const key = `custom-${activityId}`;
    const current = babyVisibility[babyId] && babyVisibility[babyId].length > 0
      ? [...babyVisibility[babyId]]
      : activities.map((a) => `custom-${a.id}`); // materialize "all visible" so toggling works
    const idx = current.indexOf(key);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(key);

    setBabyVisibility((prev) => ({ ...prev, [babyId]: current }));
    try {
      await fetch('/api/activity-settings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ babyId, visible: current, order: [] }),
      });
    } catch (error) {
      showToast({ variant: 'error', title: 'Error', message: 'Failed to save visibility', duration: 4000 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold custom-activity-heading">{t('Custom Activities')}</h3>
        <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Icon path={mdiPlus} size="1rem" className="mr-1" />{t('Add Custom Activity')}
        </Button>
      </div>

      {activities.length === 0 && !loading && (
        <p className="text-sm text-gray-500 custom-activity-empty-text">{t('No custom activities yet. Add one to get started.')}</p>
      )}

      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between rounded border p-3 custom-activity-item">
            <div className="flex items-center gap-2">
              {activity.icon.startsWith('mdi') && ICON_PATH_MAP[activity.icon] ? (
                <Icon path={ICON_PATH_MAP[activity.icon]} size="1.25rem" color={activity.color} />
              ) : (
                <span className="text-xl">{activity.icon}</span>
              )}
              <span className="font-medium custom-activity-item-name">{activity.name}</span>
              <span className="text-xs text-gray-400 custom-activity-field-count">({activity.fields.length})</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditing(activity); setModalOpen(true); }} aria-label={t('Edit Activity')}>
                <Icon path={mdiPencil} size="1rem" className="text-gray-500" />
              </button>
              <button type="button" onClick={() => handleDelete(activity.id)} aria-label={t('Delete Activity')}>
                <Icon path={mdiTrashCan} size="1rem" className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Per-baby visibility grid */}
      {babies.length > 0 && activities.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm custom-activity-table">
            <thead>
              <tr>
                <th className="text-left p-2">{t('Custom Activity')}</th>
                {babies.map((baby) => (
                  <th key={baby.id} className="p-2 text-center">{baby.firstName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-t">
                  <td className="p-2">{activity.icon} {activity.name}</td>
                  {babies.map((baby) => (
                    <td key={baby.id} className="p-2 text-center">
                      <Switch
                        checked={isVisibleForBaby(baby.id, activity.id)}
                        onCheckedChange={() => toggleBabyVisibility(baby.id, activity.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomActivityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activity={editing}
        onSaved={fetchActivities}
      />
    </div>
  );
}
