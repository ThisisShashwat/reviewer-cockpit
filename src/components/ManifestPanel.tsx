import React from 'react';
import { ManifestLookupData } from '../lib/types';

interface ManifestPanelProps {
  manifest: ManifestLookupData;
  codeUrl: string;
}

export const ManifestPanel: React.FC<ManifestPanelProps> = ({ manifest }) => {
  return (
    <div className="p-4 border-t border-rv-border bg-rv-surface select-text">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-2.5">
        <span>Cross-YSWS Double-Dipping</span>
        <span className="text-[10px] font-mono text-gray-500">Manifest API</span>
      </div>

      {manifest.isLoading ? (
        <div className="text-xs text-rv-dim py-1">
          Querying Hack Club Manifest...
        </div>
      ) : manifest.otherSubmissions.length === 0 ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-md leading-relaxed">
            <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <strong className="font-semibold text-green-800">No Double-Dipping Found:</strong>
              <p className="mt-0.5 text-[11px] text-green-700">
                This repository has not been approved or shipped for grants in any other YSWS program.
              </p>
            </div>
          </div>

          <a
            href={manifest.halceonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-rv-blue hover:underline inline-flex items-center gap-1 font-medium"
          >
            Inspect Submitter on Halceon / Bonked ↗
          </a>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-md leading-relaxed">
            <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong className="font-semibold text-red-800">Double-Dipping Risk:</strong>
              <p className="mt-0.5 text-[11px] text-red-700">
                Found {manifest.otherSubmissions.length} prior submission(s) matching this repository in Manifest.
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 list-none p-0 m-0">
            {manifest.otherSubmissions.map((sub) => (
              <li key={sub.submissionId} className="border border-rv-border rounded-md p-2 bg-rv-surface2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rv-text">{sub.yswsName || 'Other YSWS'}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    sub.shipStatus === 'shipped'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-amber-100 text-amber-700 border-amber-300'
                  }`}>
                    {sub.shipStatus}
                  </span>
                </div>
                <div className="text-[11px] text-rv-dim mt-1 flex items-center justify-between">
                  <span>{sub.hoursShipped ? `${sub.hoursShipped}h credited` : 'No hours credited'}</span>
                  <span>{sub.approvedAt ? new Date(sub.approvedAt).toLocaleDateString() : 'Pending'}</span>
                </div>
              </li>
            ))}
          </ul>

          <a
            href={manifest.halceonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-rv-blue hover:underline inline-flex items-center gap-1 font-medium"
          >
            Check Prior Submissions on Halceon ↗
          </a>
        </div>
      )}
    </div>
  );
};
