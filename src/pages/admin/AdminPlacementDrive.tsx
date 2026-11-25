import React, { useEffect, useState } from 'react';
import { placementDriveApi } from '../../api';
import { formatUkDateTime } from '../../utils/ukTime';

interface AdminPlacementItem {
  _id: string;
  student: {
    _id: string;
    name: string;
    username: string;
    email?: string;
  };
  course?: {
    _id: string;
    title: string;
  };
  resumeUrl: string;
  resumeFileName: string;
  linkedinUrl: string;
  githubUrl: string;
  status: 'pending' | 'in_review' | 'optimized';
  adminNotes: string;
  optimizedResumeUrl?: string;
  updatedAt: string;
}

export default function AdminPlacementDrive() {
  const [profiles, setProfiles] = useState<AdminPlacementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review' | 'optimized'>('all');

  const [selectedProfile, setSelectedProfile] = useState<AdminPlacementItem | null>(null);
  const [statusInput, setStatusInput] = useState<'pending' | 'in_review' | 'optimized'>('optimized');
  const [notesInput, setNotesInput] = useState('');
  const [optimizedLinkInput, setOptimizedLinkInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await placementDriveApi.getAllAdmin();
      setProfiles(res.data.profiles || []);
    } catch (err) {
      console.error('Failed to load placement profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const openReviewModal = (item: AdminPlacementItem) => {
    setSelectedProfile(item);
    setStatusInput(item.status === 'pending' ? 'optimized' : item.status);
    setNotesInput(item.adminNotes || '');
    setOptimizedLinkInput(item.optimizedResumeUrl || '');
  };

  const handleSaveReview = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      await placementDriveApi.updateAdminReview(selectedProfile._id, {
        status: statusInput,
        adminNotes: notesInput,
        optimizedResumeUrl: optimizedLinkInput.trim(),
      });
      await loadProfiles();
      setSelectedProfile(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save optimization review');
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      p.student?.name?.toLowerCase().includes(q) ||
      p.student?.username?.toLowerCase().includes(q) ||
      p.course?.title?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getFullAssetUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    const base = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
    return `${base}${url}`;
  };

  const pendingCount = profiles.filter((p) => p.status === 'pending').length;
  const inReviewCount = profiles.filter((p) => p.status === 'in_review').length;
  const optimizedCount = profiles.filter((p) => p.status === 'optimized').length;

  return (
    <div className="fade-in" style={{ padding: '4px 0 36px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, #eef5ff 0%, #f8fbff 100%)',
          border: '1px solid #dbeafe',
          borderRadius: '16px',
          padding: '22px 26px',
          marginBottom: '20px',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563eb',
              marginBottom: '6px',
            }}
          >
            CAREER & PLACEMENT CELL
          </span>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            Placement Drive Submissions
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
            Review student resumes, LinkedIn, and GitHub profiles and share optimization feedback.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadProfiles}
            className="btn btn-secondary btn-sm"
            style={{ padding: '9px 14px', borderRadius: '10px', backgroundColor: '#ffffff' }}
          >
            ↻ Refresh
          </button>
          <span
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {profiles.length} Total Submissions
          </span>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Total Profiles', value: profiles.length, accent: '#2563eb', bg: '#eff6ff' },
          { label: 'Pending Review', value: pendingCount, accent: '#d97706', bg: '#fffbeb' },
          { label: 'In Review', value: inReviewCount, accent: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Optimized', value: optimizedCount, accent: '#059669', bg: '#ecfdf5' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
                {stat.value}
              </strong>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
                {stat.label}
              </span>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: stat.bg,
                color: stat.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Submissions Card */}
      <div
        className="card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            paddingBottom: '18px',
            marginBottom: '18px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <input
              className="form-input"
              style={{ maxWidth: '320px', padding: '10px 14px', borderRadius: '10px' }}
              placeholder="Search student name, username, or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              style={{ maxWidth: '190px', padding: '10px 14px', borderRadius: '10px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'in_review' | 'optimized')}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="in_review">In Review</option>
              <option value="optimized">Optimized</option>
            </select>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Showing <strong>{filteredProfiles.length}</strong> of {profiles.length}
          </span>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '44px 20px' }}>
            <div className="spinner" />
            <span>Loading student submissions...</span>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '17px' }}>
              No Placement Drive submissions found
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Students who upload their Resume, LinkedIn, and GitHub will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              className="table"
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '13px 16px', borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: '10px' }}>
                    Student & Batch
                  </th>
                  <th style={{ padding: '13px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    Uploaded Resume
                  </th>
                  <th style={{ padding: '13px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    Profile Links
                  </th>
                  <th style={{ padding: '13px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    Status
                  </th>
                  <th style={{ padding: '13px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    Last Updated
                  </th>
                  <th
                    style={{
                      padding: '13px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      textAlign: 'right',
                      borderTopRightRadius: '10px',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((item) => {
                  const initials = (item.student?.name || 'S')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const statusStyles =
                    item.status === 'optimized'
                      ? { bg: '#dcfce7', color: '#166534', label: 'Optimized' }
                      : item.status === 'in_review'
                      ? { bg: '#fef3c7', color: '#92400e', label: 'In Review' }
                      : { bg: '#e0e7ff', color: '#3730a3', label: 'Pending' };

                  return (
                    <tr key={item._id}>
                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              fontWeight: 700,
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <strong style={{ display: 'block', color: '#0f172a', fontSize: '14px' }}>
                              {item.student?.name}
                            </strong>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              @{item.student?.username} • {item.course?.title || 'Batch'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <a
                          href={getFullAssetUrl(item.resumeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            maxWidth: '210px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.resumeFileName}
                        >
                          📄 {item.resumeFileName || 'Open Resume'}
                        </a>
                      </td>

                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={item.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 600,
                              fontSize: '12px',
                              textDecoration: 'none',
                            }}
                          >
                            LinkedIn ↗
                          </a>
                          <a
                            href={item.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              backgroundColor: '#f1f5f9',
                              color: '#0f172a',
                              fontWeight: 600,
                              fontSize: '12px',
                              textDecoration: 'none',
                            }}
                          >
                            GitHub ↗
                          </a>
                        </div>
                      </td>

                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 12px',
                            borderRadius: '999px',
                            backgroundColor: statusStyles.bg,
                            color: statusStyles.color,
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {statusStyles.label}
                        </span>
                      </td>

                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {formatUkDateTime(item.updatedAt)}
                      </td>

                      <td style={{ padding: '15px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 600 }}
                          onClick={() => openReviewModal(item)}
                        >
                          Optimize / Feedback
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optimization Modal */}
      {selectedProfile && (
        <div
          className="modal-overlay"
          style={{ padding: '20px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProfile(null);
          }}
        >
          <div className="modal" style={{ maxWidth: '540px', padding: '28px', borderRadius: '16px' }}>
            <div
              className="modal-header"
              style={{ paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Optimize Student Profile</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {selectedProfile.student?.name} (@{selectedProfile.student?.username})
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedProfile(null)}>
                ✕
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Optimization Status
              </label>
              <select
                className="form-select"
                style={{ padding: '10px 12px', borderRadius: '10px' }}
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value as 'pending' | 'in_review' | 'optimized')}
              >
                <option value="pending">Pending Review</option>
                <option value="in_review">In Review</option>
                <option value="optimized">Optimized</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Optimized Resume Link (Optional Google Drive Link)
              </label>
              <input
                type="url"
                className="form-input"
                style={{ padding: '10px 12px', borderRadius: '10px' }}
                placeholder="https://drive.google.com/..."
                value={optimizedLinkInput}
                onChange={(e) => setOptimizedLinkInput(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Optimization Notes for Student
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                style={{ padding: '10px 12px', borderRadius: '10px' }}
                placeholder="Write changes made or suggestions for Resume, LinkedIn headline, and GitHub READMEs..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />
            </div>

            <div
              className="modal-actions"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                className="btn btn-secondary"
                style={{ padding: '10px 18px', borderRadius: '10px' }}
                onClick={() => setSelectedProfile(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 20px', borderRadius: '10px' }}
                onClick={handleSaveReview}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Optimization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}