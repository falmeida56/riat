import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const emptyForm = {
    source_key: '',
    source_title: '',
    source_type: 'article',
    citation: '',
    url: '',
    summary: '',
    guidance: '',
    evidence_examples: '',
    applies_to_all_dimensions: false,
    dimensions: [],
    review_status: 'draft',
    active: true,
};

const GroundingReferences = () => {
    const [references, setReferences] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [filterDimensionId, setFilterDimensionId] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const loadDimensions = async () => {
            try {
                const surveyResponse = await api.get('/api/survey/get/');
                const surveyIds = surveyResponse.data.map(survey => survey.id_surveys);
                const dimensionResponses = await Promise.all(
                    surveyIds.map(id => api.get(`/api/dimension/get/${id}/`))
                );
                const allDimensions = dimensionResponses
                    .flatMap(response => response.data)
                    .sort((a, b) => {
                        const surveyDiff = Number(a.surveys_id_surveys) - Number(b.surveys_id_surveys);
                        if (surveyDiff !== 0) return surveyDiff;
                        return Number(a.dimension_order) - Number(b.dimension_order);
                    });
                setDimensions(allDimensions);
            } catch (err) {
                setError('Could not load RIAT dimensions.');
                console.error(err);
            }
        };

        loadDimensions();
    }, []);

    useEffect(() => {
        const loadReferences = async () => {
            setLoading(true);
            setError('');
            try {
                const params = filterDimensionId ? { dimension_id: filterDimensionId } : {};
                const response = await api.get('/api/grounding-references/', { params });
                setReferences(response.data);
            } catch (err) {
                setError('Could not load grounding references.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadReferences();
    }, [filterDimensionId, message]);

    const dimensionNameById = useMemo(() => {
        return new Map(dimensions.map(dimension => [
            Number(dimension.id_dimensions),
            dimension.dimension_name,
        ]));
    }, [dimensions]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleDimensionSelection = (event) => {
        const selectedIds = Array.from(event.target.selectedOptions, option => Number(option.value));
        setForm(prev => ({ ...prev, dimensions: selectedIds }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const handleEdit = (reference) => {
        setEditingId(reference.id_grounding_reference);
        setForm({
            source_key: reference.source_key || '',
            source_title: reference.source_title || '',
            source_type: reference.source_type || 'article',
            citation: reference.citation || '',
            url: reference.url || '',
            summary: reference.summary || '',
            guidance: reference.guidance || '',
            evidence_examples: reference.evidence_examples || '',
            applies_to_all_dimensions: Boolean(reference.applies_to_all_dimensions),
            dimensions: (reference.dimension_details || []).map(dimension => dimension.id_dimensions),
            review_status: reference.review_status || 'draft',
            active: Boolean(reference.active),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRetire = async (reference) => {
        setLoading(true);
        setError('');
        try {
            await api.patch(`/api/grounding-references/${reference.id_grounding_reference}/`, {
                active: false,
                review_status: 'retired',
            });
            setMessage(`Retired ${reference.source_key}.`);
        } catch (err) {
            setError('Could not retire this source.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const payload = {
            ...form,
            dimensions: form.applies_to_all_dimensions ? [] : form.dimensions,
        };

        try {
            if (editingId) {
                await api.patch(`/api/grounding-references/${editingId}/`, payload);
                setMessage(`Updated ${form.source_key}.`);
            } else {
                await api.post('/api/grounding-references/', payload);
                setMessage(`Created ${form.source_key}.`);
            }
            resetForm();
        } catch (err) {
            const responseError = err.response?.data;
            setError(typeof responseError === 'string' ? responseError : 'Could not save this source.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderDimensionBadges = (reference) => {
        if (reference.applies_to_all_dimensions) {
            return <span className="badge text-bg-primary me-2 mb-2">All dimensions</span>;
        }

        const referenceDimensions = reference.dimension_details || [];
        if (referenceDimensions.length === 0) {
            return <span className="badge text-bg-secondary me-2 mb-2">No dimension assigned</span>;
        }

        return referenceDimensions.map(dimension => (
            <span key={dimension.id_dimensions} className="badge text-bg-light border me-2 mb-2">
                {dimension.dimension_name}
            </span>
        ));
    };

    return (
        <div className="container mt-5" style={{ marginLeft: '16rem', maxWidth: 'calc(100% - 16rem)', overflowX: 'auto', minHeight: 'calc(100vh - 20vh)' }}>
            <div className="d-flex justify-content-between align-items-start gap-4 mb-4 ms-3">
                <div>
                    <h1 className="mb-2">Grounding Sources</h1>
                    <p className="text-muted mb-0">
                        Manage the approved references that RIAT Copilot can use to ground recommendations by dimension.
                    </p>
                </div>
                <select
                    className="form-select"
                    style={{ maxWidth: '24rem' }}
                    value={filterDimensionId}
                    onChange={(event) => setFilterDimensionId(event.target.value)}
                >
                    <option value="">All sources</option>
                    {dimensions.map(dimension => (
                        <option key={dimension.id_dimensions} value={dimension.id_dimensions}>
                            {dimension.dimension_name}
                        </option>
                    ))}
                </select>
            </div>

            <form onSubmit={handleSubmit} className="mx-3 mb-5 p-4 border rounded-2 bg-light">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label">Source key</label>
                        <input
                            className="form-control"
                            value={form.source_key}
                            onChange={(event) => handleFieldChange('source_key', event.target.value)}
                            required
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Title</label>
                        <input
                            className="form-control"
                            value={form.source_title}
                            onChange={(event) => handleFieldChange('source_title', event.target.value)}
                            required
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Source type</label>
                        <select
                            className="form-select"
                            value={form.source_type}
                            onChange={(event) => handleFieldChange('source_type', event.target.value)}
                        >
                            <option value="article">Scientific article</option>
                            <option value="framework">Framework or methodology</option>
                            <option value="standard">Standard or regulation</option>
                            <option value="report">Report or deliverable</option>
                            <option value="dataset">Dataset or extracted evidence</option>
                            <option value="internal">Internal RIAT note</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="col-md-8">
                        <label className="form-label">Citation</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            value={form.citation}
                            onChange={(event) => handleFieldChange('citation', event.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">URL</label>
                        <input
                            className="form-control"
                            type="url"
                            value={form.url}
                            onChange={(event) => handleFieldChange('url', event.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Review status</label>
                        <select
                            className="form-select"
                            value={form.review_status}
                            onChange={(event) => handleFieldChange('review_status', event.target.value)}
                        >
                            <option value="draft">Draft</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="retired">Retired</option>
                        </select>
                    </div>
                    <div className="col-md-8">
                        <label className="form-label">Affected dimensions</label>
                        <select
                            className="form-select"
                            multiple
                            size="5"
                            value={form.dimensions.map(String)}
                            onChange={handleDimensionSelection}
                            disabled={form.applies_to_all_dimensions}
                        >
                            {dimensions.map(dimension => (
                                <option key={dimension.id_dimensions} value={dimension.id_dimensions}>
                                    {dimension.dimension_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-12 d-flex gap-4">
                        <label className="form-check-label">
                            <input
                                className="form-check-input me-2"
                                type="checkbox"
                                checked={form.applies_to_all_dimensions}
                                onChange={(event) => handleFieldChange('applies_to_all_dimensions', event.target.checked)}
                            />
                            Applies to all dimensions
                        </label>
                        <label className="form-check-label">
                            <input
                                className="form-check-input me-2"
                                type="checkbox"
                                checked={form.active}
                                onChange={(event) => handleFieldChange('active', event.target.checked)}
                            />
                            Active
                        </label>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Summary</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            value={form.summary}
                            onChange={(event) => handleFieldChange('summary', event.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Guidance supported by this source</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            value={form.guidance}
                            onChange={(event) => handleFieldChange('guidance', event.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Evidence examples</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            value={form.evidence_examples}
                            onChange={(event) => handleFieldChange('evidence_examples', event.target.value)}
                        />
                    </div>
                </div>
                <div className="d-flex align-items-center gap-3 mt-4">
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {editingId ? 'Update source' : 'Create source'}
                    </button>
                    {editingId && (
                        <button className="btn btn-secondary" type="button" onClick={resetForm}>
                            Cancel edit
                        </button>
                    )}
                    {message && <span className="text-success">{message}</span>}
                    {error && <span className="text-danger">{error}</span>}
                </div>
            </form>

            <div className="mx-3">
                {loading && <p>Loading...</p>}
                {references.map(reference => (
                    <div key={reference.id_grounding_reference} className="border rounded-2 p-4 mb-3">
                        <div className="d-flex justify-content-between gap-3">
                            <div>
                                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                    <h4 className="mb-0">{reference.source_title}</h4>
                                    <span className="badge text-bg-info">{reference.source_type_label}</span>
                                    <span className={`badge ${reference.active ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                        {reference.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="badge text-bg-light border">{reference.review_status_label}</span>
                                </div>
                                <p className="text-muted mb-2">{reference.source_key}</p>
                                <div className="mb-3">{renderDimensionBadges(reference)}</div>
                                {reference.citation && <p className="mb-2"><b>Citation:</b> {reference.citation}</p>}
                                {reference.url && (
                                    <p className="mb-2">
                                        <b>URL:</b> <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.url}</a>
                                    </p>
                                )}
                                {reference.summary && <p className="mb-2"><b>Summary:</b> {reference.summary}</p>}
                                {reference.guidance && <p className="mb-2"><b>Guidance:</b> {reference.guidance}</p>}
                                {reference.evidence_examples && <p className="mb-0"><b>Evidence examples:</b> {reference.evidence_examples}</p>}
                            </div>
                            <div className="d-flex flex-column gap-2" style={{ minWidth: '8rem' }}>
                                <button className="btn btn-outline-primary" onClick={() => handleEdit(reference)}>
                                    Edit
                                </button>
                                {reference.active && (
                                    <button className="btn btn-outline-secondary" onClick={() => handleRetire(reference)}>
                                        Retire
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && references.length === 0 && (
                    <p className="text-muted">
                        No grounding sources match {filterDimensionId ? dimensionNameById.get(Number(filterDimensionId)) : 'the current filter'}.
                    </p>
                )}
            </div>
        </div>
    );
};

export default GroundingReferences;
