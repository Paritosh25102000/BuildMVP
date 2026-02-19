'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EstimateStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  FileText,
  List,
  LayoutGrid,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  status: EstimateStatus;
  issue_date: string;
  total: number;
  client: {
    id: string;
    name: string;
  } | null;
}

interface EstimatesListProps {
  estimates: Estimate[];
}

const statusConfig: Record<EstimateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" />, color: 'bg-slate-100 border-slate-200' },
  sent: { label: 'Sent', variant: 'default', icon: <Send className="h-3 w-3" />, color: 'bg-blue-50 border-blue-200' },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-50 border-green-200' },
  declined: { label: 'Failed Deal', variant: 'destructive', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-50 border-red-200' },
};

export function EstimatesList({ estimates }: EstimatesListProps) {
  const [view, setView] = useState<'list' | 'kanban'>('list');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group estimates by status for Kanban view
  const groupedEstimates = {
    draft: estimates.filter((e) => e.status === 'draft'),
    sent: estimates.filter((e) => e.status === 'sent'),
    approved: estimates.filter((e) => e.status === 'approved'),
    declined: estimates.filter((e) => e.status === 'declined'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 mt-1">
            Create and manage project estimates for your clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button asChild>
            <Link href="/estimates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Estimate
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No estimates yet</h3>
            <p className="text-slate-500 text-center mt-1 max-w-sm">
              Create your first estimate to get started with quoting projects.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/estimates/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Estimate
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : view === 'list' ? (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => {
                const statusInfo = statusConfig[estimate.status];
                return (
                  <TableRow key={estimate.id}>
                    <TableCell>
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {estimate.estimate_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="hover:text-blue-600"
                      >
                        {estimate.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {estimate.client?.name || '—'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(estimate.issue_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(estimate.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['draft', 'sent', 'approved', 'declined'] as EstimateStatus[]).map((status) => {
            const statusInfo = statusConfig[status];
            const statusEstimates = groupedEstimates[status];
            const totalValue = statusEstimates.reduce((sum, e) => sum + e.total, 0);

            return (
              <div key={status} className="space-y-3">
                <div className={`p-3 rounded-lg border ${statusInfo.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        ({statusEstimates.length})
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {statusEstimates.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-sm text-slate-400">
                        No {statusInfo.label.toLowerCase()} estimates
                      </CardContent>
                    </Card>
                  ) : (
                    statusEstimates.map((estimate) => (
                      <Link key={estimate.id} href={`/estimates/${estimate.id}`}>
                        <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-medium text-blue-600">
                                {estimate.estimate_number}
                              </span>
                              <span className="text-sm font-semibold">
                                {formatCurrency(estimate.total)}
                              </span>
                            </div>
                            <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                              {estimate.title}
                            </h4>
                            {estimate.client && (
                              <p className="text-xs text-slate-500 mt-1">
                                {estimate.client.name}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {formatDate(estimate.issue_date)}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
