'use client';

import React, { useState, useEffect } from 'react';
import { CustomActivityResponse } from '@/app/api/types';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { Trash2, Pencil, Plus } from 'lucide-react';
import {
  FormPage,
  FormPageContent,
  FormPageFooter,
} from '@/src/components/ui/form-page';
import { useToast } from '@/src/components/ui/toast';
import { useLocalization } from '@/src/context/localization';
import CustomFieldModal, { FieldDraft } from './CustomFieldModal';
import './custom-activity-modal.css';

interface CustomActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: CustomActivityResponse | null;
  onSaved?: () => void;
}

const COLOR_SWATCHES = [
  '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

function authHeaders() {
  const authToken = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : '',
  };
}

export default function CustomActivityModal({ isOpen, onClose, activity, onSaved }: CustomActivityModalProps) {
  const { t } = useLocalization();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHours, setReminderHours] = useState('8');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = !!activity;

  useEffect(() => {
    if (!isOpen) return;
    setName(activity?.name || '');
    setIcon(activity?.icon || '⭐');
    setColor(activity?.color || COLOR_SWATCHES[0]);
    setReminderEnabled(activity?.reminderEnabled || false);
    setReminderHours(String(activity?.reminderIntervalHours ?? 8));
    setFields(
      (activity?.fields || []).map((f) => ({
        id: f.id,
        name: f.name,
        fieldType: f.fieldType,
        unit: f.unit ?? undefined,
        options: f.options ?? undefined,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
      }))
    );
  }, [isOpen, activity]);

  const handleFieldSave = (draft: FieldDraft) => {
    setFields((prev) => {
      if (editingFieldIndex !== null) {
        const next = [...prev];
        next[editingFieldIndex] = draft;
        return next;
      }
      return [...prev, { ...draft, sortOrder: prev.length }];
    });
    setEditingFieldIndex(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const activityPayload = {
        name: name.trim(),
        icon,
        color,
        reminderEnabled,
        reminderIntervalHours: reminderEnabled ? parseInt(reminderHours, 10) || null : null,
      };

      // 1. Create or update the activity
      const url = isEditing ? `/api/custom-activity?id=${activity!.id}` : '/api/custom-activity';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(activityPayload) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast({ variant: 'error', title: 'Error', message: data.error || 'Failed to save activity', duration: 5000 });
        return;
      }
      const savedActivity: CustomActivityResponse = data.data;
      const activityId = savedActivity.id;

      // 2. Save fields (create new, update existing)
      const existingIds = new Set((activity?.fields || []).map((f) => f.id));
      const keptIds = new Set(fields.filter((f) => f.id).map((f) => f.id!));

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const fieldPayload = {
          customActivityId: activityId,
          name: field.name,
          fieldType: field.fieldType,
          unit: field.unit,
          options: field.options,
          isRequired: field.isRequired,
          sortOrder: i,
        };
        if (field.id) {
          await fetch(`/api/custom-activity/field?id=${field.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(fieldPayload) });
        } else {
          await fetch('/api/custom-activity/field', { method: 'POST', headers: authHeaders(), body: JSON.stringify(fieldPayload) });
        }
      }

      // 3. Delete fields removed during editing
      for (const id of Array.from(existingIds)) {
        if (id && !keptIds.has(id)) {
          await fetch(`/api/custom-activity/field?id=${id}`, { method: 'DELETE', headers: authHeaders() });
        }
      }

      onClose();
      onSaved?.();
    } catch (error) {
      console.error('Error saving custom activity:', error);
      showToast({ variant: 'error', title: 'Error', message: 'An unexpected error occurred.', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormPage isOpen={isOpen} onClose={onClose} title={isEditing ? t('Edit Activity') : t('Add Custom Activity')}>
        <FormPageContent>
          <div className="space-y-6">
            {/* Section 1: Identity */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('Activity Name')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Activity Name')} />
              </div>
              <div className="space-y-2">
                <Label>{t('Activity Icon')}</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="w-20 text-center text-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t('Activity Color')}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setColor(swatch)}
                      className={`h-8 w-8 rounded-full border-2 ${color === swatch ? 'border-gray-800 color-swatch-selected' : 'border-transparent'}`}
                      style={{ backgroundColor: swatch }}
                      aria-label={swatch}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Field Label')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => { setEditingFieldIndex(null); setFieldModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />{t('Add Field')}
                </Button>
              </div>
              <div className="space-y-1">
                {fields.map((field, index) => (
                  <div key={field.id || index} className="flex items-center justify-between rounded border p-2 custom-activity-modal-field-item">
                    <span className="text-sm">{field.name} <span className="text-gray-400 custom-activity-modal-field-type">({t(field.fieldType === 'BOOLEAN' ? 'Yes/No' : field.fieldType.charAt(0) + field.fieldType.slice(1).toLowerCase())})</span></span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setEditingFieldIndex(index); setFieldModalOpen(true); }}>
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                      <button type="button" onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Reminder (only when editing) */}
            {isEditing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('Enable Reminder')}</Label>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
                {reminderEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm custom-activity-reminder-text">{t('Remind after')}</span>
                    <Input type="number" min={1} max={72} value={reminderHours} onChange={(e) => setReminderHours(e.target.value)} className="w-20" />
                    <span className="text-sm custom-activity-reminder-text">{t('hours without a log')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </FormPageContent>
        <FormPageFooter>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>{saving ? t('Saving...') : t('Save')}</Button>
          </div>
        </FormPageFooter>
      </FormPage>

      <CustomFieldModal
        isOpen={fieldModalOpen}
        onClose={() => setFieldModalOpen(false)}
        field={editingFieldIndex !== null ? fields[editingFieldIndex] : null}
        onSave={handleFieldSave}
      />
    </>
  );
}
