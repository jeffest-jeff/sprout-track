'use client';

import React from 'react';
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
import { useLocalization } from '@/src/context/localization';

import { Icon } from '@/src/components/ui/icon';
import { mdiLoading, mdiCheckCircle, mdiCloseCircle, mdiShield, mdiShieldCheck } from '@mdi/js';

interface AccountData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  verified: boolean;
  betaparticipant: boolean;
  closed: boolean;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  familyId: string | null;
  family: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AccountViewProps {
  paginatedData: AccountData[];
  onUpdateAccount: (id: string, closed: boolean) => void;
  updatingAccountId: string | null;
  formatDateTime: (dateString: string | null) => string;
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}

export default function AccountView({
  paginatedData,
  onUpdateAccount,
  updatingAccountId,
  formatDateTime,
  sortColumn,
  sortDirection,
  onSort,
}: AccountViewProps) {
  const { t } = useLocalization();
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'email' ? sortDirection : null} onSort={() => onSort('email')}>{t('Email')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'name' ? sortDirection : null} onSort={() => onSort('name')}>{t('Name')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'createdAt' ? sortDirection : null} onSort={() => onSort('createdAt')}>{t('Created')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'family' ? sortDirection : null} onSort={() => onSort('family')}>{t('Family')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'verified' ? sortDirection : null} onSort={() => onSort('verified')}>{t('Verified')}</TableHead>
          <TableHead variant="bold" sortable sortDirection={sortColumn === 'closed' ? sortDirection : null} onSort={() => onSort('closed')}>{t('Status')}</TableHead>
          <TableHead variant="bold" className="text-right">{t('Actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              {t('No accounts found.')}
            </TableCell>
          </TableRow>
        ) : (
          paginatedData.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.email}</TableCell>
              <TableCell>
                {account.firstName || account.lastName ? 
                  `${account.firstName || ''} ${account.lastName || ''}`.trim() : 
                  'N/A'
                }
              </TableCell>
              <TableCell className="text-sm">{formatDateTime(account.createdAt)}</TableCell>
              <TableCell>
                {account.family ? (
                  <div>
                    <div className="font-medium">{account.family.name}</div>
                    <div className="text-xs text-gray-500">/{account.family.slug}</div>
                  </div>
                ) : (
                  'No family'
                )}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {account.verified ? (
                    <>
                      <Icon path={mdiShieldCheck} size="0.75rem" className="mr-1" />
                      {t('Verified')}
                    </>
                  ) : (
                    <>
                      <Icon path={mdiShield} size="0.75rem" className="mr-1" />
                      {t('Unverified')}
                    </>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    !account.closed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {!account.closed ? 'Active' : 'Closed'}
                </span>
                {account.closedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDateTime(account.closedAt)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateAccount(account.id, !account.closed)}
                    disabled={updatingAccountId === account.id}
                    title={account.closed ? 'Reinstate account' : 'Close account'}
                  >
                    {updatingAccountId === account.id ? (
                      <Icon path={mdiLoading} size="1rem" spin />
                    ) : account.closed ? (
                      <Icon path={mdiCheckCircle} size="1rem" />
                    ) : (
                      <Icon path={mdiCloseCircle} size="1rem" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
