import React, { useCallback, useEffect, useState } from 'react';
import { batchApi, projectApi } from '../../api';
import { formatUkDate } from '../../utils/ukTime';

interface Batch {
  _id: string;
  name: string;
  course?: { title: string };
}

interface Project {
  _id: string;
  batch: Batch;
  name: string;
  description: string;
  skills: string[];
  resourceType: 'drive' | 'zip';
  resourceUrl?: string;
  originalFileName?: string;
  createdAt: string;
}

const emptyForm = {
  batch: '',
  name: '',
  description: '',
  skills: '',
  resourceType: 'drive' as 'drive' | 'zip',
  resourceUrl: '',
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async (batchFilter: string) => {
    try {
      const [batchRes, projectRes] = await Promise.all([
        batchApi.getAll(),
        projectApi.getAll(batchFilter === 'all' ? undefined : batchFilter),
      ]);
      setBatches(batchRes.data.batches || []);
      setProjects(projectRes.data.projects || []);
      setError('');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(selectedBatch); }, [fetchProjects, selectedBatch]);

  const openCreate = () => {
    setEditProject(null);
    setProjectFile(null);
    setForm({ ...emptyForm, batch: selectedBatch !== 'all' ? selectedBatch : (batches[0]?._id || '') });
    setError('');
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditProject(project);
    setProjectFile(null);
    setForm({
      batch: project.batch?._id || '',
      name: project.name,
      description: project.description || '',
      skills: (project.skills || []).join(', '),
      resourceType: project.resourceType,
      resourceUrl: project.resourceUrl || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.batch || !form.name.trim()) {
      setError('Batch and project name are required');
      return;
    }
    if (form.resourceType === 'drive' && !form.resourceUrl.trim()) {
      setError('A Google Drive link is required');
      return;
    }
    if (form.resourceType === 'zip' && !projectFile && (!editProject || editProject.resourceType !== 'zip')) {
      setError('Choose a ZIP file');
      return;
    }
    if (projectFile && projectFile.size > 50 * 1024 * 1024) {
      setError('ZIP file must be 50 MB or smaller');
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (projectFile) payload.append('projectFile', projectFile);

    setSaving(true);
    try {
      if (editProject) await projectApi.update(editProject._id, payload);
      else await projectApi.create(payload);
      await fetchProjects(selectedBatch);
      setShowModal(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Unable to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    try {
      await projectApi.delete(project._id);
      await fetchProjects(selectedBatch);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Unable to delete project');
    }
  };

  const handleDownload = async (project: Project) => {
    setDownloadingId(project._id);
    try {
      const response = await projectApi.download(project._id);
      saveBlob(response.data, project.originalFileName || `${project.name}.zip`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Unable to download project ZIP');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Publish practical projects to a batch as a Google Drive link or ZIP file</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Project</button>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Filter by Batch</label>
          <select className="form-select" value={selectedBatch} onChange={event => setSelectedBatch(event.target.value)}>
            <option value="all">All batches</option>
            {batches.map(batch => <option key={batch._id} value={batch._id}>{batch.name}{batch.course?.title ? ` - ${batch.course.title}` : ''}</option>)}
          </select>
        </div>
      </div>

      {error && !showModal && <div className="alert alert-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">PJ</div><p>No projects have been added yet.</p></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Project</th><th>Batch</th><th>Skills</th><th>Resource</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {projects.map(project => (
                <tr key={project._id}>
                  <td><strong>{project.name}</strong>{project.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{project.description.slice(0, 90)}{project.description.length > 90 ? '...' : ''}</p>}</td>
                  <td><strong>{project.batch?.name || 'Batch not found'}</strong>{project.batch?.course?.title && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{project.batch.course.title}</p>}</td>
                  <td><div className="project-skill-list">{project.skills.length ? project.skills.map(skill => <span key={skill} className="project-skill">{skill}</span>) : <span className="text-muted">—</span>}</div></td>
                  <td>
                    {project.resourceType === 'drive' ? (
                      <a className="btn btn-secondary btn-sm" href={project.resourceUrl} target="_blank" rel="noreferrer">Open Drive</a>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(project)} disabled={downloadingId === project._id}>{downloadingId === project._id ? 'Downloading...' : 'Download ZIP'}</button>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatUkDate(project.createdAt)}</td>
                  <td><div className="actions-row"><button className="btn btn-secondary btn-sm" onClick={() => openEdit(project)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(project)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header"><h2>{editProject ? 'Edit Project' : 'Add Project'}</h2><button className="modal-close" onClick={() => setShowModal(false)}>X</button></div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Batch</label>
              <select className="form-select" value={form.batch} onChange={event => setForm(current => ({ ...current, batch: event.target.value }))}>
                <option value="">Select batch</option>
                {batches.map(batch => <option key={batch._id} value={batch._id}>{batch.name}{batch.course?.title ? ` - ${batch.course.title}` : ''}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Project Name</label><input className="form-input" placeholder="e.g. Sales Performance Dashboard" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Skills Used</label><input className="form-input" placeholder="Excel, Power BI, SQL" value={form.skills} onChange={event => setForm(current => ({ ...current, skills: event.target.value }))} /><small className="form-help">Separate skills with commas.</small></div>
            <div className="form-group"><label className="form-label">Description (optional)</label><textarea className="form-textarea" rows={3} placeholder="What learners will build and practise..." value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></div>
            <div className="form-group">
              <label className="form-label">Project Resource</label>
              <select className="form-select" value={form.resourceType} onChange={event => { setProjectFile(null); setForm(current => ({ ...current, resourceType: event.target.value as 'drive' | 'zip' })); }}>
                <option value="drive">Google Drive link</option>
                <option value="zip">ZIP file</option>
              </select>
            </div>
            {form.resourceType === 'drive' ? (
              <div className="form-group"><label className="form-label">Google Drive Link</label><input className="form-input" type="url" placeholder="https://drive.google.com/..." value={form.resourceUrl} onChange={event => setForm(current => ({ ...current, resourceUrl: event.target.value }))} /></div>
            ) : (
              <div className="form-group"><label className="form-label">ZIP File {editProject?.resourceType === 'zip' ? '(leave empty to keep current file)' : ''}</label><input className="form-input" type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={event => setProjectFile(event.target.files?.[0] || null)} /><small className="form-help">Maximum file size: 50 MB.</small></div>
            )}
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editProject ? 'Update Project' : 'Publish Project')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
