'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch,
} from '@/src/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useLocalization } from '@/src/context/localization';
import { authFetch, formatDateTime } from '@/src/components/familymanager/utils';

interface CustomActivityRow {
  familyId: string;
  familyName: string;
  familySlug: string;
  activityId: string;
  activityName: string;
  icon: string;
  isActive: boolean;
  fieldCount: number;
  logCount: number;
  lastEntryAt: string | null;
}

interface SysAdminCustomActivityView {
  familyId: string;
  familyName: string;
  familySlug: string;
  customActivities: Array<{
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
    fieldCount: number;
    logCount: number;
    lastEntryAt: string | null;
  }>;
}

export default function CustomActivitiesPage() {
  const { t } = useLocalization();
  const [rows, setRows] = useState<CustomActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/family/custom-activities');
      const data = await res.json();
      if (data.success) {
        const flat: CustomActivityRow[] = [];
        (data.data as SysAdminCustomActivityView[]).forEach((fam) => {
          fam.customActivities.forEach((ca) => {
            flat.push({
              familyId: fam.familyId,
              familyName: fam.familyName,
              familySlug: fam.familySlug,
              activityId: ca.id,
              activityName: ca.name,
              icon: ca.icon,
              isActive: ca.isActive,
              fieldCount: ca.fieldCount,
              logCount: ca.logCount,
              lastEntryAt: ca.lastEntryAt,
            });
          });
        });
        setRows(flat);
      }
    } catch (error) {
      console.error('Error fetching custom activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.familyName.toLowerCase().includes(q) || r.activityName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">{t('Custom Activities')}</h1>
      <TableSearch value={search} onSearchChange={setSearch} placeholder={t('Search')} />
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Family')}</TableHead>
              <TableHead>{t('Activity Name')}</TableHead>
              <TableHead>{t('Field Label')}</TableHead>
              <TableHead>{t('Log Entry')}</TableHead>
              <TableHead>{t('Last Entry')}</TableHead>
              <TableHead>{t('Active')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.activityId}>
                <TableCell>{r.familyName}</TableCell>
                <TableCell>{r.icon} {r.activityName}</TableCell>
                <TableCell>{r.fieldCount}</TableCell>
                <TableCell>{r.logCount}</TableCell>
                <TableCell>{r.lastEntryAt ? formatDateTime(r.lastEntryAt) : '—'}</TableCell>
                <TableCell>{r.isActive ? t('Yes') : t('No')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
