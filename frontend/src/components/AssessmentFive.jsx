import { useState } from 'react';
import SubDimensions from './SubDimensions';
import AssessmentAlert from '../components/AssessmentAlert';
import SaveIcon from '@mui/icons-material/Save';

const AssessmentFive = ({ loading, projectPhase, allDimensions, topLevelDimensions, dimensionsNumber, currentDimension, handleDimensionChange, dimensionStage, setDimensionStage, selectedValues, setSelectedValues, handleStatementAnswerSubmit,  handleAssessmentSubmit, statementCounter, submittingAssessment, setSubmittingAssessment, naSelected, setNaSelected, submitMessage}) => {

    const [explanation, setExplanation] = useState('');
    const [example, setExample] = useState('');
    const [showAlert, setShowAlert] = useState(false);

    // Use topLevelDimensions to get subdimensions, not allDimensions
    const currentTopLevelDimension = topLevelDimensions[currentDimension];
    const subDimensionsInfo = currentTopLevelDimension ? allDimensions.filter(dimension =>
        currentTopLevelDimension.sub_dimensions?.some(subId => subId === dimension.id_dimensions)
    ) : [];

    const sanitizeSimple = (html) => {
        const allowedTags = ['strong', 'em'];
        return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, tagName) =>
            allowedTags.includes(tagName.toLowerCase()) ? tag : ''
        );
    }

    return (
        <>
            {allDimensions.length > 0 && topLevelDimensions.length > 0 && loading === false && (
                <div className="global-container">
                    <AssessmentAlert show={showAlert} setShow={setShowAlert} />
                    <div className="create-project-container">
                        <p className='mb-0'><b>Phase {projectPhase}</b> Assessment</p>
                        {dimensionStage === 3 ? (
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: '100%' }}>
                                </div>
                            </div>
                        ) : (
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${(currentDimension / dimensionsNumber) * 100}%` }}>
                                </div>
                            </div>
                        )}
                        {dimensionStage === 1 && (
                            <div style={{ minHeight: '52vh' }}>
                                <h1 className="dimension-name">{topLevelDimensions[currentDimension].dimension_name}</h1>
                                <h2 style={{ color: '#002d46' }}>{topLevelDimensions[currentDimension].dimension_short_description}</h2>
                                <p className="dimension-description">{topLevelDimensions[currentDimension].dimension_description}</p>
                            </div>
                        )}
                        {dimensionStage === 2 && (
                            <div>
                                <h1 className="dimension-name-small">{currentDimension + 1}. {topLevelDimensions[currentDimension].dimension_name}</h1>
                                <p className="dimension-description-small">{topLevelDimensions[currentDimension].dimension_description}</p>
                                <p style={{ fontSize: '0.9rem' }}><b>*</b> <em>mandatory question</em></p>
                                {topLevelDimensions[currentDimension].statements.map(statement => {

                                    const allNaSelected = Object.values(naSelected).every(v => v === true);

                                    statementCounter++;

                                    const scaleLabels = statement.scale.scale_levels > 0
                                        ? statement.scale.scale_labels.split(',').map(label => label.trim())
                                        : [];

                                    if (!statement.scale.scale_levels > 0 && allNaSelected) {
                                        return null;
                                    }

                                    return (
                                        <>
                                            <div key={statement.id_statements} className="statement-container">
                                                {statement.scale.scale_levels > 0 ? (
                                                    <h4 className="statement-name"><span className="statement-number">{currentDimension + 1}.{statementCounter}</span> {statement.statement_name} *</h4>
                                                ) : (
                                                    <h4 className="statement-name">{statement.statement_name} *</h4>
                                                )}
                                                {statement.statement_description &&
                                                    <p
                                                        className="statement-description"
                                                        style={{ color: '#002d46', fontStyle: 'italic' }}
                                                        dangerouslySetInnerHTML={{ __html: sanitizeSimple(statement.statement_description) }}
                                                    />
                                                }
                                                <>
                                                    {statement.scale.scale_levels > 0 ? (
                                                        <>
                                                            <div className="statemet-radio-buttons-container">
                                                                {scaleLabels.map((label, index) => (
                                                                    <label key={index} className="statement-radio-buttons">
                                                                        <span className="label-text">{label}</span>
                                                                        <input
                                                                            className="radio-input"
                                                                            type="radio"
                                                                            name={statement.id_statements}
                                                                            value={index + 1}
                                                                            checked={selectedValues[`${statement.id_statements}`] === index + 1}
                                                                            onChange={(e) => {
                                                                                const selectedValue = parseInt(e.target.value, 10);
                                                                                setSelectedValues(prev => ({
                                                                                    ...prev,
                                                                                    [statement.id_statements]: selectedValue
                                                                                }));
                                                                                setNaSelected(prev => ({
                                                                                    ...prev,
                                                                                    [statement.id_statements]: false
                                                                                }));
                                                                            }}
                                                                        />
                                                                    </label>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <label>
                                                                    <input
                                                                        className="checkbox-input me-3 mt-5"
                                                                        type="checkbox"
                                                                        name={`${statement.id_statements}_na`}
                                                                        checked={naSelected[statement.id_statements] || (selectedValues[statement.id_statements] !== '' && typeof selectedValues[statement.id_statements] === 'string') || false}
                                                                        onChange={(e) => {
                                                                            const isChecked = e.target.checked;
                                                                            setNaSelected(prev => ({
                                                                                ...prev,
                                                                                [statement.id_statements]: isChecked
                                                                            }));
                                                                            if (isChecked) {
                                                                                setSelectedValues(prev => ({
                                                                                    ...prev,
                                                                                    [statement.id_statements]: ''
                                                                                }));
                                                                            } else {
                                                                                setSelectedValues(prev => {
                                                                                    delete prev[statement.id_statements];
                                                                                    return prev
                                                                                })
                                                                            }
                                                                        }}
                                                                    />
                                                                    {naSelected[statement.id_statements] ? <b>Prefer not to answer</b> : 'Prefer not to answer'}
                                                                </label>
                                                                {naSelected[statement.id_statements] || typeof (selectedValues[statement.id_statements]) === 'string' ? (
                                                                    <>
                                                                        <p>Explain why you chose this option</p>
                                                                        <textarea
                                                                            className="textarea"
                                                                            name={`${statement.id_statements}_explanation`}
                                                                            placeholder="200 char. max"
                                                                            maxLength={200}
                                                                            value={explanation || selectedValues[`${statement.id_statements}`] || ''}
                                                                            onChange={(e) => {
                                                                                const newValue = e.target.value;
                                                                                setSelectedValues(prev => ({
                                                                                    ...prev,
                                                                                    [statement.id_statements]: newValue
                                                                                }));
                                                                            }}
                                                                        // onBlur={() => {
                                                                        //     setSelectedValues(prev => ({
                                                                        //         ...prev,
                                                                        //         [statement.id_statements]: explanation
                                                                        //     }));
                                                                        //     setExplanation('');
                                                                        // }}
                                                                        />
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <textarea
                                                            className="textarea"
                                                            placeholder="1000 char. max"
                                                            maxLength={1000}
                                                            value={example || selectedValues[`${statement.id_statements}`]}
                                                            onChange={(e) => {
                                                                const newValue = e.target.value;
                                                                setSelectedValues(prev => {
                                                                    const updated = { ...prev };

                                                                    if (allNaSelected || newValue === '') {
                                                                        delete updated[statement.id_statements];
                                                                    } else {
                                                                        updated[statement.id_statements] = newValue;
                                                                    }

                                                                    return updated;
                                                                });
                                                            }}

                                                        /* onBlur={() => {
                                                            setSelectedValues(prev => ({
                                                                ...prev,
                                                                [statement.id_statements]: example
                                                            }));
                                                            setExample('');
                                                        }} */
                                                        />
                                                    )}
                                                </>
                                            </div >
                                            {subDimensionsInfo && subDimensionsInfo.length > 0 && (
                                                <SubDimensions subDimensionsInfo={subDimensionsInfo} selectedValues={selectedValues} setSelectedValues={setSelectedValues} naSelected={naSelected} setNaSelected={setNaSelected} explanation={explanation} setExplanation={setExplanation} example={example} setExample={setExample} currentDimension={currentDimension} sanitizeSimple={sanitizeSimple} />
                                            )
                                            }
                                        </>
                                    );
                                })}
                            </div>
                        )}
                        {dimensionStage === 3 && (
                            <div className='w-100 text-center' style={{ minHeight: '70vh' }}>
                                {submittingAssessment === true ? (
                                    <div className='text-center'>
                                        <p className='fs-4'>You have reached the end of the assessment.</p>
                                        <p> Click on the <b>'Submit Assessment'</b> button below to generate your report.</p>
                                        <p>This document will include a <b>unique access code</b> displayed at the top of the report page. Make sure to <b>save</b> this code so you can retrieve the report later if needed.</p>
                                        <p>Click <b>'Go back'</b> to return to the assessment and rethink any questions.</p>
                                        <div className='d-flex flex-row justify-content-center align-items-center gap-5 mt-5'>
                                            <a onClick={() => {
                                                setDimensionStage(2);
                                            }} style={{ textDecoration: 'underline', cursor: 'pointer', color: '#008bbe' }} className="cancel-button">
                                                Go back
                                            </a>
                                            <button onClick={(e) => {
                                                handleAssessmentSubmit(e);
                                                setSubmittingAssessment(false);
                                            }} className="forms-button">Submit Assessment</button>
                                        </div>
                                        <p className='mt-5 mb-0 fs-6'><SaveIcon style={{ fontSize: '2rem' }} /> Or <a href='/projects'>click here</a> to save your progress and return to active projects</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p>{submitMessage}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {dimensionStage !== 3 && (
                            <div className={`button-container d-flex ${currentDimension === 0 && dimensionStage === 1 ? 'justify-content-end' : 'justify-content-between'} w-100 ${dimensionStage === 1 ? 'mt-5' : ''}`} style={{ marginRight: '4rem' }}>
                                {currentDimension === 0 && dimensionStage === 1 ? (
                                    null // No back button on the first dimension
                                ) : (
                                    <button onClick={() => {
                                        if (loading) return;

                                        if (dimensionStage === 1) {
                                            handleDimensionChange(currentDimension - 1);
                                            setDimensionStage(2);
                                            setSelectedValues({});
                                            setNaSelected({});
                                        } else if (dimensionStage === 2) {
                                            setDimensionStage(dimensionStage - 1);
                                        }
                                        disabled = { loading }
                                    }} className="forms-button">Back</button>
                                )}
                                {currentDimension === dimensionsNumber - 1 && dimensionStage === 2 ? (
                                    <button onClick={() => {
                                        const allNaSelected = Object.values(naSelected).every(v => v === true);

                                        let totalStatements = topLevelDimensions[currentDimension].statements.length +
                                            subDimensionsInfo.reduce((sum, subDimension) => sum + subDimension.statements.length, 0);

                                        // Clone selectedValues and update locally
                                        let updatedSelectedValues = { ...selectedValues };

                                        if (allNaSelected) {
                                            // Remove keys for statements with scale_levels < 0
                                            [...topLevelDimensions[currentDimension].statements, ...subDimensionsInfo.flatMap(sd => sd.statements)]
                                                .filter(statement => statement.scale.scale_levels <= 0)
                                                .forEach(statement => {
                                                    delete updatedSelectedValues[statement.id_statements];
                                                });

                                            totalStatements = totalStatements - 1;
                                        }

                                        const selectedValuesCount = Object.keys(updatedSelectedValues).length;

                                        if (
                                            selectedValuesCount === totalStatements &&
                                            !Object.values(updatedSelectedValues).includes('')
                                        ) {
                                            // Update state once before submit
                                            setSelectedValues(updatedSelectedValues);

                                            const handleSubmit = async () => {
                                                await handleStatementAnswerSubmit();
                                                setSubmittingAssessment(true);
                                                setDimensionStage(3);
                                            };
                                            handleSubmit();
                                        } else {
                                            // Also update state if changed to keep consistent
                                            setSelectedValues(updatedSelectedValues);
                                            setShowAlert(true);
                                        }
                                    }} className="forms-button">Next</button>

                                ) : (
                                    <button onClick={() => {
                                        if (dimensionStage === 1) {
                                            setDimensionStage(dimensionStage + 1);
                                            setSelectedValues({});
                                            setNaSelected({});
                                        } else if (dimensionStage === 2) {

                                            const allNaSelected = Object.values(naSelected).every(v => v === true);

                                            let totalStatements = topLevelDimensions[currentDimension].statements.length +
                                                subDimensionsInfo.reduce((sum, subDimension) => sum + subDimension.statements.length, 0);

                                            // Clone selectedValues and update locally
                                            let updatedSelectedValues = { ...selectedValues };

                                            if (allNaSelected) {
                                                // Remove keys for statements with scale_levels < 0
                                                [...topLevelDimensions[currentDimension].statements, ...subDimensionsInfo.flatMap(sd => sd.statements)]
                                                    .filter(statement => statement.scale.scale_levels <= 0)
                                                    .forEach(statement => {
                                                        delete updatedSelectedValues[statement.id_statements];
                                                    });

                                                totalStatements = totalStatements - 1;
                                            }

                                            const selectedValuesCount = Object.keys(updatedSelectedValues).length;

                                            if (
                                                (selectedValuesCount === totalStatements &&
                                                    !Object.values(updatedSelectedValues).includes(''))
                                            ) {
                                                handleStatementAnswerSubmit();
                                                handleDimensionChange(currentDimension + 1);
                                                setDimensionStage(1);
                                            } else {
                                                setShowAlert(true)
                                            }
                                        }
                                    }} className="forms-button">Next</button>
                                )}
                            </div>
                        )}
                    </div>
                </div >
            )}
        </>
    );
};


export default AssessmentFive;