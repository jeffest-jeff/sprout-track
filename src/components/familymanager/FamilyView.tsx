'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import type { SortDirection } from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Icon } from '@/src/components/ui/icon';
import { mdiPencil, mdiAccountGroup, mdiLogin, mdiCheck, mdiClose, mdiLoading, mdiAlertCircle } from '@mdi/js';
import { ShareButton } from '@/src/components/ui/share-button';
import { useLocalization } from '@/src/context/localization';

// Types for our family data
interface FamilyData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastEntryAt?: string | null;
  caretakerCount?: number;
  babyCount?: number;
}

interface FamilyViewProps {
  families: FamilyData[];
  paginatedData: FamilyData[];
  onEdit: (family: FamilyData) => void;
  onViewCaretakers: (family: FamilyData) => void;
  onLogin: (family: FamilyData) => void;
  onSave: (family: FamilyData) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  editingData: Partial<FamilyData>;
  setEditingData: React.Dispatch<React.SetStateAction<Partial<FamilyData>>>;
  saving: boolean;
  slugError: string;
  checkingSlug: boolean;
  appConfig: { rootDomain: string; enableHttps: boolean } | null;
  formatDateTime: (dateString: string | null) => string;
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}

export default function FamilyView({
  families,
  paginatedData,
  onEdit,
  onViewCaretakers,
  onLogin,
  onSave,
  onCancelEdit,
  editingId,
  editingData,
  setEditingData,
  saving,
  slugError,
  checkingSlug,
  appConfig,
  formatDateTime,
  sortColumn,
  sortDirection,
  onSort,
}: FamilyViewProps) {
  const { t } = useLocalization();
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'name' ? sortDirection : null} onSort={() => onSort('name')}>{t('Family Name')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'slug' ? sortDirection : null} onSort={() => onSort('slug')}>Link/Slug</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'createdAt' ? sortDirection : null} onSort={() => onSort('createdAt')}>{t('Created')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'lastEntryAt' ? sortDirection : null} onSort={() => onSort('lastEntryAt')}>{t('Last Entry')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'isActive' ? sortDirection : null} onSort={() => onSort('isActive')}>{t('Status')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'caretakerCount' ? sortDirection : null} onSort={() => onSort('caretakerCount')}>{t('Members')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'babyCount' ? sortDirection : null} onSort={() => onSort('babyCount')}>{t('Babies')}</TableHead>
          <TableHead variant="bold" className="text-right">{t('Actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              {t('No families found.')}
            </TableCell>
          </TableRow>
        ) : (
          paginatedData.map((family) => {
            const isEditing = editingId === family.id;
            
            return (
              <TableRow key={family.id}>
                <TableCell className="font-medium">
                  {isEditing ? (
                    <Input
                      value={editingData.name || ''}
                      onChange={(e) => setEditingData(prev => ({ ...prev, name: e.target.value }))}
                      className="min-w-[200px]"
                    />
                  ) : (
                    family.name
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {isEditing ? (
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          value={editingData.slug || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, slug: e.target.value }))}
                          className={`min-w-[150px] ${slugError ? 'border-red-500' : ''}`}
                        />
                        {checkingSlug && (
                          <Icon path={mdiLoading} size="1rem" spin className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        )}
                      </div>
                      {slugError && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <Icon path={mdiAlertCircle} size="0.75rem" />
                          {slugError}
                        </div>
                      )}
                    </div>
                  ) : (
                    family.slug
                  )}
                </TableCell>
                <TableCell className="text-sm">{formatDateTime(family.createdAt)}</TableCell>
                <TableCell className="text-sm">{family.lastEntryAt ? formatDateTime(family.lastEntryAt) : t('No entries')}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editingData.isActive !== undefined ? editingData.isActive : family.isActive}
                        onCheckedChange={(checked) => setEditingData(prev => ({ ...prev, isActive: !!checked }))}
                      />
                      <label className="text-sm">{t('Active')}</label>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        family.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {family.isActive ? t('Active') : t('Inactive')}
                    </span>
                  )}
                </TableCell>
                <TableCell>{family.caretakerCount || 0}</TableCell>
                <TableCell>{family.babyCount || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSave(family)}
                          disabled={saving || !!slugError || checkingSlug}
                        >
                          {saving ? (
                            <Icon path={mdiLoading} size="1rem" spin />
                          ) : (
                            <Icon path={mdiCheck} size="1rem" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCancelEdit}
                          disabled={saving}
                        >
                          <Icon path={mdiClose} size="1rem" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(family)}
                          title={t("Edit family")}
                        >
                          <Icon path={mdiPencil} size="1rem" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewCaretakers(family)}
                          title={t("View caretakers")}
                        >
                          <Icon path={mdiAccountGroup} size="1rem" />
                        </Button>
                        <ShareButton
                          familySlug={family.slug}
                          familyName={family.name}
                          appConfig={appConfig || undefined}
                          variant="outline"
                          size="sm"
                          showText={false}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onLogin(family)}
                          title={t("Login to family")}
                        >
                          <Icon path={mdiLogin} size="1rem" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
