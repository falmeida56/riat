import AssessmentOne from "../components/AssessmentOne"
import AssessmentTwo from "../components/AssessmentTwo";
import AssessmentThree from "../components/AssessmentThree";
import AssessmentFour from "../components/AssessmentFour";
import AssessmentFive from "../components/AssessmentFive";
import AssessmentNavigation from "../components/AssessmentNavigation";
import SelectDimensions from "../components/SelectDimensions";
import { useProject } from "../contexts/ProjectContext";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from '../api';
import '../styles/forms.css';
import '../styles/global.css';
import '../styles/assessment.css';

const Assessment = () => {

    const { projectId, setProjectId, step, setStep, projectName, setProjectName, projectAcronym, setProjectAcronym, projectOrganization, projectOwnerName, setProjectOwnerName, setProjectOrganization, projectPhase, setProjectPhase, projectTrl, setProjectTrl, projectMrl, setProjectMrl, projectSrl, setProjectSrl, projectValueChain, setProjectValueChain, userRole, setUserRole, userFunction, setUserFunction, setError, setSuccess, setLoading, loading } = useProject();

    const [surveyId, setSurveyId] = useState('');

    const navigate = useNavigate();


    //GET SUBMISSION ID FROM URL
    const { id } = useParams();

    // STEP 1 & 2
    const [agreement, setAgreement] = useState(false);
    const [instructionsRead, setInstructionsRead] = useState(false);

    // STEP 5
    const [allDimensions, setAllDimensions] = useState([]);
    const [topLevelDimensions, setTopLevelDimensions] = useState([]);
    const [filteredTopLevelDimensions, setFilteredTopLevelDimensions] = useState([]);
    const [selectedDimensionIds, setSelectedDimensionIds] = useState([]);
    const [dimensionsNumber, setDimensionsNumber] = useState(0);
    const [currentDimension, setCurrentDimension] = useState(0);
    const [dimensionStage, setDimensionStage] = useState(1);
    const [isAssessmentReady, setIsAssessmentReady] = useState(false);
    const [selectedValues, setSelectedValues] = useState([]);
    const [answersLoaded, setAnswersLoaded] = useState(false);
    const [existingAnswers, setExistingAnswers] = useState([]);
    const [statementCounter, setStatementCounter] = useState(0);
    const [submittingAssessment, setSubmittingAssessment] = useState(false);
    const [naSelected, setNaSelected] = useState({});
    const [submitMessage, setSubmitMessage] = useState('');

    const firstRender = useRef(true);

    //GET SUBMISSION DATA

    useEffect(() => {

        if (id !== undefined) {

            const getSubmission = async () => {
                try {
                    const response = await api.get(`/api/submission/${id}/`);

                    setSurveyId(response.data.surveys_id_surveys);
                    
                    // Try to load saved dimension selection from localStorage
                    const savedSelection = localStorage.getItem(`dimension_selection_${id}`);
                    if (savedSelection) {
                        setSelectedDimensionIds(JSON.parse(savedSelection));
                    }
                    
                    setStep(5);

                } catch (error) {
                    alert(error);
                    console.error(error);
                }
            }

            getSubmission();


        } else {
            if (step !== 4) {
                setProjectId(null);
                setStep(1);
            }
        }
    }, [id]);

    /* STEP 1 - INSTRUCTIONS */

    const handleInstructionsRead = (e) => {
        e.preventDefault();

        const isChecked = document.getElementById("instructions").checked;
        setInstructionsRead(isChecked);
        if (isChecked) {
            setStep(3);
            setError('');
        } else {
            setError("You must read the instructions and mark the checkbox to proceed.");
        }
    };


    /* STEP 2 - RGPD */

    const handleAgreement = (e) => {
        e.preventDefault();

        const isChecked = document.getElementById("agreement").checked;
        setAgreement(isChecked);
        if (isChecked) {
            setStep(3);
            setError('');
        } else {
            setError("You must agree to the data privacy policy to proceed.");
        }
    };

    /* STEP 3 - REGISTER PROJECT */

    const handleProjectSubmit = async (e) => {
        setLoading(true)
        e.preventDefault();

        //project name
        if (!projectName.trim()) {
            setError("Project name cannot be empty");
            setLoading(false);
            return;
        }

        if (projectName.length > 300) {
            setError("Project name cannot exceed 300 characters");
            setLoading(false);
            return;
        }

        //organization
        const invalidOrgs = [
            'test', 'n/a', 'org', 'no name', 'none', 'null', 'undefined', 'empresa', 'company', 'organization', 'organização', 'instituição', 'institution', 'sem nome', 'sem organização', 'no organization', 'no company'
        ];
        if (
            projectOrganization.trim().length < 2 ||
            invalidOrgs.includes(projectOrganization.trim().toLowerCase())
        ) {
            setError("Organization must be at least 2 characters long and cannot be a generic or placeholder name (e.g., 'Test', 'N/A', 'Org', 'No name', etc.)");
            setLoading(false);
            return;
        }

        if (projectOrganization.length > 100) {
            setError("Organization name cannot exceed 100 characters");
            setLoading(false);
            return;
        }

        // owner name
        if (projectOwnerName.trim().length < 2) {
            setError("Please introduce a valid name for the person responsible for the project");
            setLoading(false);
            return;
        }

        if (projectOwnerName.length > 100) {
            setError("The name of the person responsible for the project cannot exceed 100 characters");
            setLoading(false);
            return;
        }

        //trl, mrl, srl
        if (projectTrl === '') {
            setError("Project TRL value must be selected");
            setLoading(false);
            return;
        }

        if (projectMrl === '') {
            setError("Project MRL value must be selected");
            setLoading(false);
            return;
        }

        if (projectSrl === '') {
            setError("Project SRL value must be selected");
            setLoading(false);
            return;
        }

        //role
        if (userRole === '') {
            setError("Role in the project cannot be empty");
            setLoading(false);
            return;
        }

        //function in the organization
        if (userFunction.trim().length < 2) {
            setError("Please introduce a valid answer for the Function in the organization field");
            setLoading(false);
            return;
        }

        if (userFunction.trim().length > 45) {
            setError("Function in the organization field cannot exceed 100 characters");
            setLoading(false);
            return;
        }

        setError('');

        try {

            const response = await api.post('/api/project/create/', {
                project_name: projectName, project_acronym: projectAcronym, project_organization: projectOrganization, project_owner_name: projectOwnerName, project_trl: projectTrl, project_mrl: projectMrl, project_srl: projectSrl, project_value_chain: projectValueChain, project_phase: 1, metadata_data: [
                    {
                        users_has_projects_role: userRole,
                        users_has_projects_function: userFunction,
                        users_has_projects_state: 0,
                    }
                ]
            });

            setSuccess('Project created successfully!');
            setProjectId(null);
            setProjectName('');
            setProjectAcronym('');
            setProjectOrganization('');
            setProjectOwnerName('');
            setUserRole('');
            setUserFunction('');
            setProjectTrl('');
            setProjectMrl('');
            setProjectSrl('');
            setProjectValueChain('');

            const projectId = response.data.id_projects;
            setProjectId(projectId);
            setTimeout(() => {
                setStep(4);
            });
            setError('');


        } catch (error) {
            alert(error);
            console.error(error);
            setError('Internal Server Error. Error creating project. Please try again.');

        } finally {
            setLoading(false);
            setError('');
            setSuccess('');
        }

    }

    /* STEP 4 - SELECT PROJECT'S PHASE */

    const handlePhaseUpdate = async (e) => {

        setLoading(true)
        e.preventDefault();

        if (projectPhase === 1) {
            setLoading(false);
            setSuccess('Phase selected successfully');
            // Don't navigate yet - go to dimension selection first
            setStep(4.5);
            return;
        } else {

            try {
                await api.patch(`/api/project/update/${projectId}/`, {
                    project_phase: projectPhase,
                });

                setSuccess('Phase selected successfully');
                // Don't navigate yet - go to dimension selection first
                setStep(4.5);

            } catch (error) {
                alert(error);
                console.error(error);

            } finally {
                setLoading(false);
            }
        }
    };

    /* STEP 4.5 - SELECT DIMENSIONS */

    const handleDimensionSelectionSubmit = () => {
        if (selectedDimensionIds.length === 0) {
            setError("Please select at least one dimension to continue.");
            return;
        }
        
        // Save dimension selection to localStorage
        if (id) {
            localStorage.setItem(`dimension_selection_${id}`, JSON.stringify(selectedDimensionIds));
        }
        
        setError('');
        setStep(5);
    };


    // STEP 5 - ASSESSMENT | GET DIMENSIONS AND STATEMENTS

    useEffect(() => {

        if (surveyId && surveyId !== undefined) {

            const getDimensionsAndStatements = async () => {

                setLoading(true);

                try {
                    const responseAllSurveys = await api.get(`/api/survey/get/`);
                    const allSurveys = responseAllSurveys.data;

                    const responseCurrentSurvey = await api.get(`/api/survey/get/${surveyId}/`);
                    const survey = responseCurrentSurvey.data;

                    const surveyPhase = parseInt(survey[0].survey_name.match(/\d+/)?.[0], 10);

                    // 1. Filter surveys by phase and sort them
                    const surveysToLoad = allSurveys
                        .filter(s => {
                            const match = s.survey_name.match(/\d+/);
                            if (!match) return false;
                            const phase = parseInt(match[0], 10);
                            return phase <= surveyPhase;
                        })
                        .sort((a, b) => {
                            const phaseA = parseInt(a.survey_name.match(/\d+/)?.[0], 10);
                            const phaseB = parseInt(b.survey_name.match(/\d+/)?.[0], 10);
                            return phaseA - phaseB;
                        });

                    // 2. Get dimensions for each survey, first phase first, then second and so on
                    const dimensionResponses = await Promise.all(
                        surveysToLoad.map(s =>
                            api.get(`/api/dimension/get/${s.id_surveys}/`)
                        )
                    );

                    // 3. Get statements for each dimension and sort the dimensions by dimension_order
                    const dimensionsWithStatements = (
                        await Promise.all(
                            dimensionResponses.map(async res => {
                                const dims = res.data.sort((a, b) => a.dimension_order - b.dimension_order);
                                return await Promise.all(
                                    dims.map(async dimension => {
                                        const statementsRes = await api.get(`/api/statement/get/${dimension.id_dimensions}/`);
                                        return {
                                            ...dimension,
                                            statements: statementsRes.data
                                        };
                                    })
                                );
                            })
                        )
                    ).flat(); // 4. Flatten the array of arrays

                    setAllDimensions(dimensionsWithStatements);


                } catch (error) {
                    alert(error);
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };

            getDimensionsAndStatements();

        }
    }, [id, surveyId]);


    // STEP 5 - GET DIMENSIONS THAT ARE NOT PART OF OTHER AS SUBDIMENSIONS

    useEffect(() => {
        if (allDimensions.length > 0) {

            const subdimensionIds = new Set(
                allDimensions.flatMap(d => d.sub_dimensions || [])
            );

            const topLevel = allDimensions.filter(d => !subdimensionIds.has(d.id_dimensions));
            setTopLevelDimensions(topLevel);
            
            // Initialize selectedDimensionIds with all dimensions if not set
            if (selectedDimensionIds.length === 0 && step < 4.5) {
                setSelectedDimensionIds(topLevel.map(d => d.id_dimensions));
            }

            setDimensionsNumber(topLevel.length);
        }
    }, [allDimensions]);

    // STEP 5 - FILTER TOP LEVEL DIMENSIONS BASED ON USER SELECTION
    useEffect(() => {
        if (topLevelDimensions.length > 0 && selectedDimensionIds.length > 0) {
            const filtered = topLevelDimensions.filter(d => selectedDimensionIds.includes(d.id_dimensions));
            setFilteredTopLevelDimensions(filtered);
            setDimensionsNumber(filtered.length);
        }
    }, [topLevelDimensions, selectedDimensionIds]);

    // STEP 5 - RENDER ASSESSMENT IF READY
    useEffect(() => {
        if (step === 5 && surveyId && allDimensions.length > 0) {
            setIsAssessmentReady(true);
        }

    }, [step, surveyId, allDimensions]);


    // STEP 5 - PROCEED TO NEXT DIMENSION
    const handleDimensionChange = (index) => {
        if (index >= 0 && index < allDimensions.length) {
            setCurrentDimension(index);
            setDimensionStage(1);
        }
    };

    // STEP 5 - REGISTER STATEMENTS ANSWERS
    const handleStatementAnswerSubmit = async () => {

        setLoading(true);

        const requests = Object.entries(selectedValues).map(async ([key, value]) => {
            try {
                const response = await api.get(`/api/answer/${id}/${key}/`);
                const existingAnswer = response.data; // assume que tem um campo "value"

                const existingValue = existingAnswer.value;

                const existingType = typeof existingValue;
                const newType = typeof value;

                if (existingType !== newType) {
                    // Tipos diferentes: DELETE + POST
                    await api.delete(`/api/answer/${id}/${key}/`);
                    return api.post(`/api/answer/${id}/`, {
                        submissions_id_submissions: id,
                        statements_id_statements: key,
                        value: value,
                    });
                } else {
                    // Mesmo tipo: PATCH
                    return api.patch(`/api/answer/${id}/${key}/`, {
                        submissions_id_submissions: id,
                        statements_id_statements: key,
                        value: value,
                    });
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    // Não existe ainda: criar
                    return api.post(`/api/answer/${id}/`, {
                        submissions_id_submissions: id,
                        statements_id_statements: key,
                        value: value,
                    });
                } else {
                    console.error(`Erro ao processar resposta ${key}:`, error);
                    throw error;
                }
            }
        });

        try {
            await Promise.all(requests);
            setSelectedValues({});
        } catch (error) {
            alert('Error submitting answers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Reset answersLoaded every time ID changes
    useEffect(() => {
        setAnswersLoaded(false);
    }, [id]);

    // STEP 5 - GET EXISTING ANSWERS
    useEffect(() => {
        if (id !== undefined) {
            setLoading(true);
            const getExistingAnswers = async () => {
                try {
                    const response = await api.get(`/api/answer/${id}/`);

                    const existingAnswers = response.data.reduce((acc, answer) => {
                        acc[answer.statements_id_statements] = {
                            value: answer.value,
                            answer_creation_time: answer.answer_creation_time,
                            dimension_order: answer.dimension_order
                        };
                        return acc;
                    }, {});
                    setExistingAnswers(existingAnswers);
                    setAnswersLoaded(true);  // Indica que terminou de carregar
                } catch (error) {
                    console.error('Error fetching existing answers:', error);
                } finally {
                    setLoading(false);
                }
            };
            getExistingAnswers();
        }
    }, [id, currentDimension, submittingAssessment]);

    // STEP 5 - SET CURRENT DIMENSION BASED ON LAST ANSWERED STATEMENT
    /*  useEffect(() => {
         if (existingAnswers.length === 0 || allDimensions.length === 0 || topLevelDimensions.length === 0 || firstRender.current === false) return;
 
         const lastAnsweredStatementId = Object.keys(existingAnswers)
             .map(key => ({
                 id: Number(key),
                 creationTime: existingAnswers[key].answer_creation_time
             }))
             .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime))[0]?.id;
 
         const dimensionWithLastAnswer = topLevelDimensions.find(dimension =>
             dimension.statements.some(statement => statement.id_statements === lastAnsweredStatementId)
         );
 
         if (dimensionWithLastAnswer) {
             const dimensionIndex = topLevelDimensions.indexOf(dimensionWithLastAnswer);
             setCurrentDimension(dimensionIndex);
         }
 
         firstRender.current = false; // Ensure this effect runs only once after existingAnswers is set
 
     }, [existingAnswers, allDimensions]); */


    // STEP 5 - SET SELECTED VALUES BASED ON EXISTING ANSWERS
    useEffect(() => {
        if (!answersLoaded || loading) return;

        if (dimensionStage === 2) {
            const currentSubDimensions = allDimensions.filter(dimension =>
                topLevelDimensions[currentDimension]?.sub_dimensions?.includes(dimension.id_dimensions)
            );

            const currentDimensionStatements = [
                ...(topLevelDimensions[currentDimension]?.statements || []),
                ...currentSubDimensions.flatMap(subDimension => subDimension.statements || [])
            ];

            const filteredAnswers = Object.keys(existingAnswers)
                .filter(key => currentDimensionStatements.some(statement =>
                    statement.id_statements.toString() === key
                ))
                .reduce((obj, key) => {
                    obj[key] = existingAnswers[key].value;
                    return obj;
                }, {});

            if (Object.keys(filteredAnswers).length !== 0) {
                setSelectedValues(filteredAnswers);

                const newNaSelected = {};

                for (const key of Object.keys(filteredAnswers)) {
                    const value = filteredAnswers[key];

                    const matchingStatement = currentDimensionStatements.find(
                        stmt => stmt.id_statements.toString() === key
                    );

                    if (
                        matchingStatement &&
                        matchingStatement.scale.scale_levels > 0 &&
                        typeof value === 'string'
                    ) {
                        newNaSelected[key] = true;
                    } else if (
                        matchingStatement &&
                        matchingStatement.scale.scale_levels > 0 &&
                        typeof value !== 'string'
                    ) {
                        newNaSelected[key] = false;
                    }
                }

                setNaSelected(newNaSelected);
            }
        }
    }, [answersLoaded, currentDimension, dimensionStage, loading]);


    // STEP 5 - SUBMIT ASSESSMENT

    const handleAssessmentSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);

        const finalScore = Object.values(existingAnswers).reduce((sum, object) => {
            const value = object.value;
            return typeof value === 'number' ? sum + value : sum;
        }, 0);

        console.log(finalScore)

        if (finalScore === 0) {
            setSubmitMessage("You responded 'prefer not to answer' to all questions, so the data is insufficient to generate meaningful recommendations. Consider revising your inputs the next time you complete this assessment.")
            return
        } else {
            setSubmitMessage("Generating your results, please wait a moment.")
        };

        const totalStatements = allDimensions.flatMap(dimension => dimension.statements).filter(
            (statement) => statement.statement_name !== 'Provide Examples');

        const totalStatementsLength = allDimensions.flatMap(dimension => dimension.statements).filter(
            (statement) => statement.statement_name !== 'Provide Examples'
        ).length;

        const maxPointsPossible = totalStatements.reduce((sum, statement) => {
            return sum + (statement.scale?.scale_levels || 0);
        }, 0);

        const ponderatedScore = Math.round(((finalScore + Number.EPSILON) / totalStatementsLength) * 100) / 100;

        console.log(ponderatedScore)
        console.log(totalStatementsLength)

        const pointsByDimension = () => {
            return allDimensions.map(dimension => {
                const totalPointsByDimension = dimension.statements.reduce((sum, statement) => {
                    const value = existingAnswers[statement.id_statements]?.value;
                    return typeof value === 'number' ? sum + value : sum;
                }, 0);
                return { dimensionId: dimension.id_dimensions, totalPointsByDimension };
            });
        };

        const dimensionsPoints = pointsByDimension();

        try {
            await handleStatementAnswerSubmit();

            await api.patch(`/api/submission/${id}/`, {
                submission_state: 2,
            });

            const response = await api.post(`api/report/${id}/`, {
                submissions_id_submissions: id,
                final_score: finalScore,
                max_possible_points: maxPointsPossible,
                ponderated_score: ponderatedScore,
                surveys_id_surveys: surveyId,
                dimension_scores: dimensionsPoints,
            });

            const token = response.data.report_token;

            setTimeout(() => {
                navigate(`/report/${token}`);
            }, 4000);

        } catch (error) {
            alert(error);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {step === 1 && (
                <AssessmentOne handleInstructionsRead={handleInstructionsRead} />
            )}
            {step === 2 && (
                <AssessmentTwo handleAgreement={handleAgreement} />
            )}
            {step === 3 && (
                <AssessmentThree handleProjectSubmit={handleProjectSubmit} />
            )}
            {step === 4 && (
                <AssessmentFour handlePhaseUpdate={handlePhaseUpdate} />
            )}
            {step === 4.5 && topLevelDimensions.length > 0 && (
                <SelectDimensions 
                    topLevelDimensions={topLevelDimensions} 
                    selectedDimensionIds={selectedDimensionIds}
                    setSelectedDimensionIds={setSelectedDimensionIds}
                    handleDimensionSelectionSubmit={handleDimensionSelectionSubmit}
                />
            )}
            {isAssessmentReady && step === 5 && (
                <>
                    <AssessmentFive loading={loading} projectPhase={projectPhase} allDimensions={allDimensions} topLevelDimensions={filteredTopLevelDimensions} dimensionsNumber={dimensionsNumber} currentDimension={currentDimension} handleDimensionChange={handleDimensionChange} dimensionStage={dimensionStage} setDimensionStage={setDimensionStage} selectedValues={selectedValues} setSelectedValues={setSelectedValues} handleStatementAnswerSubmit={handleStatementAnswerSubmit} existingAnswers={existingAnswers} firstRender={firstRender} handleAssessmentSubmit={handleAssessmentSubmit} statementCounter={statementCounter} submittingAssessment={submittingAssessment} setSubmittingAssessment={setSubmittingAssessment} naSelected={naSelected} setNaSelected={setNaSelected} submitMessage={submitMessage} />
                    <AssessmentNavigation topLevelDimensions={filteredTopLevelDimensions} existingAnswers={existingAnswers} currentIndex={currentDimension} setCurrentDimension={setCurrentDimension} />
                </>
            )}

        </>
    );

}

export default Assessment;