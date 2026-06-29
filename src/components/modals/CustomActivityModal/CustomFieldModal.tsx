'use client';

import React, { useState, useEffect } from 'react';
import { CustomFieldType } from '@prisma/client';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
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
import { useLocalization } from '@/src/context/localization';

export interface FieldDraft {
  id?: string; // present when editing an existing field
  name: string;
  fieldType: CustomFieldType;
  unit?: string;
  options?: string; // JSON array string
  isRequired: boolean;
  sortOrder: number;
}

interface CustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  field?: FieldDraft | null;
  onSave: (field: FieldDraft) => void;
}

const FIELD_TYPES: { value: CustomFieldType; labelKey: string }[] = [
  { value: 'NUMBER', labelKey: 'Number' },
  { value: 'TEXT', labelKey: 'Text' },
  { value: 'DURATION', labelKey: 'Duration' },
  { value: 'BOOLEAN', labelKey: 'Yes/No' },
  { value: 'SELECT', labelKey: 'Select List' },
];

export default function CustomFieldModal({ isOpen, onClose, field, onSave }: CustomFieldModalProps) {
  const { t } = useLocalization();
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('NUMBER');
  const [unit, setUnit] = useState('');
  const [optionsText, setOptionsText] = useState(''); // comma-separated
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(field?.name || '');
    setFieldType(field?.fieldType || 'NUMBER');
    setUnit(field?.unit || '');
    let opts: string[] = [];
    try { opts = field?.options ? JSON.parse(field.options) : []; } catch { opts = []; }
    setOptionsText(opts.join(', '));
    setIsRequired(field?.isRequired || false);
  }, [isOpen, field]);

  const handleSave = () => {
    if (!name.trim()) return;
    const options = fieldType === 'SELECT'
      ? JSON.stringify(optionsText.split(',').map((s) => s.trim()).filter(Boolean))
      : undefined;
    onSave({
      id: field?.id,
      name: name.trim(),
      fieldType,
      unit: fieldType === 'NUMBER' && unit.trim() ? unit.trim() : undefined,
      options,
      isRequired,
      sortOrder: field?.sortOrder ?? 0,
    });
    onClose();
  };

  return (
    <FormPage isOpen={isOpen} onClose={onClose} title={field ? t('Edit Field') : t('Add Field')}>
      <FormPageContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Field Label')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Field Label')} />
          </div>
          <div className="space-y-2">
            <Label>{t('Field Type')}</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>{t(ft.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fieldType === 'NUMBER' && (
            <div className="space-y-2">
              <Label>{t('Unit (optional)')}</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mL, oz, mg..." />
            </div>
          )}
          {fieldType === 'SELECT' && (
            <div className="space-y-2">
              <Label>{t('Options')}</Label>
              <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="A, B, C" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>{t('Required')}</Label>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>
        </div>
      </FormPageContent>
      <FormPageFooter>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{t('Save')}</Button>
        </div>
      </FormPageFooter>
    </FormPage>
  );
}
