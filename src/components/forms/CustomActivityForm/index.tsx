'use client';

import React, { useState, useEffect } from 'react';
import { CustomActivityResponse, CustomActivityLogResponse } from '@/app/api/types';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { DateTimePicker } from '@/src/components/ui/date-time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  FormPage,
  FormPageContent,
  FormPageFooter,
} from '@/src/components/ui/form-page';
import { useTimezone } from '@/app/context/timezone';
import { useToast } from '@/src/components/ui/toast';
import { handleExpirationError } from '@/src/lib/expiration-error-handler';
import { useLocalization } from '@/src/context/localization';

interface CustomActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  babyId: string | undefined;
  initialTime: string;
  customActivity: CustomActivityResponse;
  activity?: CustomActivityLogResponse;
  onSuccess?: () => void;
}

// Duration value stored as "MM:SS"
function parseDuration(value: string): { minutes: number; seconds: number } {
  const [m, s] = (value || '').split(':');
  return { minutes: parseInt(m, 10) || 0, seconds: parseInt(s, 10) || 0 };
}

export default function CustomActivityForm({
  isOpen,
  onClose,
  babyId,
  initialTime,
  customActivity,
  activity,
  onSuccess,
}: CustomActivityFormProps) {
  const { t } = useLocalization();
  const { toUTCString } = useTimezone();
  const { showToast } = useToast();

  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date(initialTime));
  const [notes, setNotes] = useState('');
  // fieldId -> string value
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Initialize date/time
    const base = activity ? activity.time : initialTime;
    const d = new Date(base);
    setSelectedDateTime(isNaN(d.getTime()) ? new Date() : d);
    setNotes(activity?.notes || '');

    // Initialize field values
    const initial: Record<string, string> = {};
    if (activity) {
      for (const fv of activity.fieldValues) {
        initial[fv.customActivityFieldId] = fv.value;
      }
    }
    setValues(initial);
  }, [isOpen, activity, initialTime]);

  const setFieldValue = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyId) return;

    // Validate required fields
    for (const field of customActivity.fields) {
      if (field.isRequired && !values[field.id]) {
        showToast({ variant: 'error', title: 'Error', message: `${field.name} ${t('Required')}`, duration: 4000 });
        return;
      }
    }

    setLoading(true);
    try {
      const fieldValues = customActivity.fields
        .filter((f) => values[f.id] !== undefined && values[f.id] !== '')
        .map((f) => ({ customActivityFieldId: f.id, value: values[f.id] }));

      const payload = {
        babyId,
        customActivityId: customActivity.id,
        time: toUTCString(selectedDateTime),
        notes: notes || undefined,
        fieldValues,
      };

      const authToken = localStorage.getItem('authToken');
      const url = activity ? `/api/custom-activity-log?id=${activity.id}` : '/api/custom-activity-log';
      const method = activity ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const { isExpirationError } = await handleExpirationError(response, showToast, 'tracking activities');
          if (isExpirationError) return;
        }
        const errorData = await response.json().catch(() => ({}));
        showToast({ variant: 'error', title: 'Error', message: errorData.error || 'Failed to save', duration: 5000 });
        return;
      }

      const data = await response.json();
      if (data.success) {
        onClose();
        onSuccess?.();
      } else {
        showToast({ variant: 'error', title: 'Error', message: data.error || 'Failed to save', duration: 5000 });
      }
    } catch (error) {
      console.error('Error saving custom activity log:', error);
      showToast({ variant: 'error', title: 'Error', message: 'An unexpected error occurred.', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: CustomActivityResponse['fields'][number]) => {
    const value = values[field.id] ?? '';
    switch (field.fieldType) {
      case 'NUMBER':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              placeholder={field.name}
            />
            {field.unit && <span className="text-sm text-gray-500">{field.unit}</span>}
          </div>
        );
      case 'TEXT':
        return (
          <Input value={value} onChange={(e) => setFieldValue(field.id, e.target.value)} placeholder={field.name} />
        );
      case 'BOOLEAN':
        return (
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => setFieldValue(field.id, checked ? 'true' : 'false')}
          />
        );
      case 'SELECT': {
        let options: string[] = [];
        try { options = field.options ? JSON.parse(field.options) : []; } catch { options = []; }
        return (
          <Select value={value} onValueChange={(v) => setFieldValue(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('Select List')} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'DURATION': {
        const { minutes, seconds } = parseDuration(value);
        const update = (m: number, s: number) => setFieldValue(field.id, `${m}:${String(s).padStart(2, '0')}`);
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={String(minutes)}
              onChange={(e) => update(parseInt(e.target.value, 10) || 0, seconds)}
              className="w-20"
            />
            <span className="text-sm text-gray-500">{t('min')}</span>
            <Input
              type="number"
              value={String(seconds)}
              onChange={(e) => update(minutes, parseInt(e.target.value, 10) || 0)}
              className="w-20"
            />
            <span className="text-sm text-gray-500">{t('sec')}</span>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <FormPage
      isOpen={isOpen}
      onClose={onClose}
      title={`${customActivity.icon} ${customActivity.name}`}
    >
      <FormPageContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Date & Time')}</Label>
              <DateTimePicker value={selectedDateTime} onChange={setSelectedDateTime} disabled={loading} />
            </div>

            {customActivity.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>{field.name}{field.isRequired ? ' *' : ''}</Label>
                {renderField(field)}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="notes">{t('Notes')}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        </form>
      </FormPageContent>
      <FormPageFooter>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('Saving...') : activity ? t('Update') : t('Save')}
          </Button>
        </div>
      </FormPageFooter>
    </FormPage>
  );
}
