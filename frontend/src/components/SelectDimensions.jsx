import { useState, useEffect } from "react";
import { useProject } from "../contexts/ProjectContext";
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const SelectDimensions = ({ topLevelDimensions, selectedDimensionIds, setSelectedDimensionIds, handleDimensionSelectionSubmit }) => {
    const { error, setError } = useProject();
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [selectAll, setSelectAll] = useState(false);

    // Calculate estimated time based on selected dimensions
    useEffect(() => {
        if (topLevelDimensions.length === 0) return;

        const totalStatements = topLevelDimensions
            .filter(dim => selectedDimensionIds.includes(dim.id_dimensions))
            .reduce((sum, dim) => sum + dim.statements.length, 0);

        // Estimate: 30 seconds per statement
        const timeInMinutes = Math.ceil((totalStatements * 30) / 60);
        setEstimatedTime(timeInMinutes);
    }, [selectedDimensionIds, topLevelDimensions]);

    // Handle individual dimension checkbox
    const handleDimensionToggle = (dimensionId) => {
        setSelectedDimensionIds(prev => {
            if (prev.includes(dimensionId)) {
                return prev.filter(id => id !== dimensionId);
            } else {
                return [...prev, dimensionId];
            }
        });
        setError('');
    };

    // Handle select all checkbox
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedDimensionIds([]);
        } else {
            setSelectedDimensionIds(topLevelDimensions.map(dim => dim.id_dimensions));
        }
        setSelectAll(!selectAll);
        setError('');
    };

    // Update selectAll state when individual checkboxes change
    useEffect(() => {
        if (topLevelDimensions.length > 0) {
            setSelectAll(selectedDimensionIds.length === topLevelDimensions.length);
        }
    }, [selectedDimensionIds, topLevelDimensions]);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedDimensionIds.length === 0) {
            setError("Please select at least one dimension to continue.");
            return;
        }
        setError('');
        handleDimensionSelectionSubmit();
    };

    return (
        <div className="global-container">
            <div className="create-project-container">
                <h1>Select Dimensions for Assessment</h1>
                <p>Choose which dimensions you would like to answer. You can select one or more dimensions based on your project's needs.</p>

                {/* Select All Option */}
                <div className="mb-4" style={{ borderBottom: '2px solid #002d46', paddingBottom: '1rem' }}>
                    <label className="d-flex align-items-center" style={{ cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="me-3"
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Select All Dimensions ({topLevelDimensions.length})</span>
                    </label>
                </div>

                {/* Dimensions List */}
                <div className="dimensions-list" style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    {topLevelDimensions.map((dimension, index) => {
                        const isSelected = selectedDimensionIds.includes(dimension.id_dimensions);
                        const statementCount = dimension.statements.length;
                        
                        return (
                            <div 
                                key={dimension.id_dimensions} 
                                className={`dimension-item border rounded p-3 mb-3 ${isSelected ? 'bg-light' : ''}`}
                                style={{ 
                                    borderColor: isSelected ? '#64c8eb' : '#dee2e6',
                                    borderWidth: isSelected ? '2px' : '1px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <label className="d-flex align-items-start" style={{ cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleDimensionToggle(dimension.id_dimensions)}
                                        className="me-3 mt-1"
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div className="d-flex align-items-center mb-2">
                                            {isSelected && <CheckCircleIcon className="me-2" style={{ color: '#64c8eb', fontSize: '1.2rem' }} />}
                                            <span style={{ fontSize: '1.05rem', fontWeight: isSelected ? 'bold' : '600', color: '#002d46' }}>
                                                {index + 1}. {dimension.dimension_name}
                                            </span>
                                        </div>
                                        <p className="mb-2" style={{ fontSize: '0.9rem', color: '#555', marginLeft: isSelected ? '28px' : '0' }}>
                                            {dimension.dimension_short_description}
                                        </p>
                                        <div style={{ fontSize: '0.85rem', color: '#777', marginLeft: isSelected ? '28px' : '0' }}>
                                            <AccessTimeIcon style={{ fontSize: '0.9rem', marginRight: '5px', verticalAlign: 'middle' }} />
                                            {statementCount} question{statementCount !== 1 ? 's' : ''} • ~{Math.ceil((statementCount * 30) / 60)} min
                                        </div>
                                    </div>
                                </label>
                            </div>
                        );
                    })}
                </div>

                {/* Estimated Time Summary */}
                <div 
                    className="time-estimate p-3 mb-3 rounded"
                    style={{ backgroundColor: '#f0f8ff', border: '1px solid #64c8eb' }}
                >
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <AccessTimeIcon className="me-2" style={{ color: '#002d46', verticalAlign: 'middle' }} />
                            <strong>Estimated completion time:</strong>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#002d46' }}>
                            {selectedDimensionIds.length === 0 ? '-' : `~${estimatedTime} minutes`}
                        </div>
                    </div>
                    <div className="mt-2" style={{ fontSize: '0.9rem', color: '#555' }}>
                        {selectedDimensionIds.length} dimension{selectedDimensionIds.length !== 1 ? 's' : ''} selected
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <p className="error-message mb-3">
                        <ErrorIcon className="me-2" />
                        {error}
                    </p>
                )}

                {/* Submit Button */}
                <div className="button-container text-end">
                    <button 
                        onClick={handleSubmit} 
                        className='forms-button'
                        disabled={selectedDimensionIds.length === 0}
                        style={{ opacity: selectedDimensionIds.length === 0 ? 0.6 : 1 }}
                    >
                        Start Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectDimensions;
