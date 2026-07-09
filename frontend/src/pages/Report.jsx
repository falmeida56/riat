import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import api from '../api';
import Chart from "react-apexcharts";
import ReportAnswers from "../components/ReportAnswers";
import ReportCopilotPanel from "../components/ReportCopilotPanel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const DownloadPDFButton = lazy(() => import("../components/PdfReport"));

const Report = () => {


    const { user } = useUser();

    // general report data
    const [reportData, setReportData] = useState(null);
    const [reportError, setReportError] = useState("");
    const [creationTime, setCreationTime] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectOrganization, setProjectOrganization] = useState("");
    const [loadedGeneralData, setLoadedGeneralData] = useState(false);
    const [reportCode, setReportCode] = useState('');
    const [projectPhase, setProjectPhase] = useState('');
    const [projectAcronym, setProjectAcronym] = useState('');
    // chart data
    const [chartCategories, setChartCategories] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loadedChartData, setLoadedChartData] = useState(false);
    // dimensions and answers data
    const [showAnswers, setShowAnswers] = useState(false);
    const [dimensionsData, setDimensionsData] = useState([]);
    const [loadedDimensionsData, setLoadedDimensionsData] = useState(false);
    // score and recommendations
    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [recommendationLevel, setRecommendationLevel] = useState(0);
    const [recommendation, setRecommendation] = useState("");
    const [loadedScoreData, setLoadedScoreData] = useState(false);

    const sanitizeSimple = (html) => {
        const allowedTags = ['strong', 'em'];
        return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, tagName) =>
            allowedTags.includes(tagName.toLowerCase()) ? tag : ''
        );
    }

    const { token } = useParams();

    const getAssessedDimensionIds = useCallback(() => {
        const explicitIds = reportData?.details?.assessed_dimension_ids;
        if (Array.isArray(explicitIds) && explicitIds.length > 0) {
            return explicitIds.map(id => Number(id));
        }

        return (reportData?.details?.dimension_scores || [])
            .map(score => Number(score.dimensions_id_dimensions_id))
            .filter(Boolean);
    }, [reportData]);

    const getDimensionById = useCallback(() => {
        return new Map(
            (reportData?.details?.dimensions || []).map(dimension => [
                Number(dimension.id),
                dimension,
            ])
        );
    }, [reportData]);

    useEffect(() => {
        const getReport = async () => {
            setReportCode(token);
            setReportError("");
            try {
                const response = await api.get(`/api/report/detail/${token}/`);
                setReportData(response.data);
            } catch (error) {
                const message = error.response?.data?.error || "Could not load this report.";
                setReportError(message);
            }
        }
        getReport();
    }, [token]);

    // GENERAL REPORT DATA
    useEffect(() => {
        if (reportData?.details?.project) {
            const creationTime = reportData.report_creation_date;
            const formattedCreationTime = new Date(creationTime).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            setCreationTime(formattedCreationTime);

            const projectName = reportData.details.project.name;
            const projectOrganization = reportData.details.project.organization;
            const projectPhase = reportData.details.project.phase;
            const projectAcronym = reportData.details.project.acronym;

            setProjectName(projectName);
            setProjectOrganization(projectOrganization);
            setProjectPhase(projectPhase);
            setProjectAcronym(projectAcronym);

            setLoadedGeneralData(true);
        }
    }, [getAssessedDimensionIds, reportData]);

    //CHART DATA
    const getChartCategories = useCallback(() => {
        if (reportData?.details?.dimension_scores) {
            const categories = reportData.details.dimension_scores.map(item => item.dimension_name);
            setChartCategories(categories);
            return categories;
        }
    }, [reportData]);

    const getChartData = useCallback(() => {
        if (reportData?.details?.dimensions && reportData?.details?.dimension_scores) {
            const dimensionById = getDimensionById();

            const normalizedScores = reportData.details.dimension_scores.map((item) => {
                const dimension = dimensionById.get(Number(item.dimensions_id_dimensions_id));
                const totalLabels = (dimension?.statements || []).reduce((sum, statement) => {
                    if (statement.scale_labels && statement.scale_labels !== "n/a") {
                        return sum + statement.scale_labels.split(',').length;
                    }
                    return sum;
                }, 0) || 1;

                return item.reports_score_dimension_score / totalLabels;
            });

            const percentageScores = normalizedScores.map(score => Math.round(score * 100));
            setChartData(percentageScores);

        }
    }, [getDimensionById, reportData]);

    useEffect(() => {
        if (reportData?.details) {
            getChartCategories();
            getChartData();
            setLoadedChartData(true);
        }
    }, [getChartCategories, getChartData, reportData]);

    const [options, setOptions] = useState({
        chart: {
            id: "basic-bar"
        },
        xaxis: {
            categories: [],
            labels: {
                style: {
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    colors: new Array(30).fill('#002d46')
                },
                offsetY: -1,
            },
        },
        yaxis: {
            max: 100,
            labels: {
                formatter: (val) => `${val}%`,
                style: {
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    colors: ['#002d46']
                }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => `${val}%`,
            background: {
                enabled: true,
                borderRadius: 2,
            },
            style: {
                fontSize: '12px',
            }
        },
        plotOptions: {
            radar: {
                polygons: {
                    strokeColor: '#e8e8e8',
                    strokeWidth: 2,
                    fill: {
                        colors: ['#f8f8f8', '#fff']
                    }
                }
            }
        }
    });

    useEffect(() => {
        setOptions((prevOptions) => ({
            ...prevOptions,
            xaxis: {
                ...prevOptions.xaxis,
                categories: chartCategories,
            }
        }));
    }, [chartCategories]);

    const [series, setSeries] = useState([
        {
            name: "Dimension Score",
            data: []
        }
    ]);

    useEffect(() => {
        setSeries([
            {
                name: "Dimension Score",
                data: chartData
            }
        ]);
    }, [chartData]);

    // SCORE AND RECOMMENDATIONS

    useEffect(() => {
        if (reportData?.overall_score?.overall_recommendation) {
            const score = reportData.overall_score.reports_overall_score_value;
            const maxScore = reportData.overall_score.reports_overall_score_max_value;
            setScore(score);
            setMaxScore(maxScore);
            setLoadedScoreData(true);

            const recommendationLevel = reportData.overall_score.overall_recommendation.recommendation_name;
            const recommendation = reportData.overall_score.overall_recommendation.recommendation_description;
            setRecommendationLevel(recommendationLevel);
            setRecommendation(recommendation);
            setLoadedScoreData(true);
        }
    }, [getAssessedDimensionIds, reportData]);

    //STATEMENTS AND ANSWERS
    useEffect(() => {
        if (reportData?.details?.dimensions) {
            const assessedDimensionIds = new Set(getAssessedDimensionIds());
            const dimensionScoreOrder = new Map(
                (reportData?.details?.dimension_scores || []).map((score, index) => [
                    Number(score.dimensions_id_dimensions_id),
                    index,
                ])
            );

            const formatted = reportData.details.dimensions
                .filter(dimension => assessedDimensionIds.size === 0 || assessedDimensionIds.has(Number(dimension.id)))
                .sort((a, b) => {
                    const orderA = dimensionScoreOrder.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER;
                    const orderB = dimensionScoreOrder.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER;
                    return orderA - orderB;
                })
                .map(dimension => ({
                id: dimension.id,
                name: dimension.name,
                description: dimension.description,
                short_description: dimension.short_description,
                statements: dimension.statements.map(statement => ({
                    id: statement.id,
                    name: statement.name,
                    description: statement.description,
                    scale_labels: statement.scale_labels,
                    answers: statement.answers.map(answer => ({
                        id: answer.id,
                        value: answer.scale_label !== null ? answer.scale_label : answer.value,

                    }))
                }))
            }));

            setDimensionsData(formatted);
            setLoadedDimensionsData(true);
        }
    }, [getAssessedDimensionIds, reportData]);

    return (
        <div className="global-container" style={user?.user_role === 1 ? { marginLeft: '16rem', maxWidth: 'calc(100% - 16rem)', overflowX: 'auto' } : null}>
            <div className="create-project-container">
                {reportError && (
                    <div className="alert alert-danger" role="alert">
                        {reportError}
                    </div>
                )}
                {!reportError && !reportData?.details && (
                    <div className="alert alert-info" role="status">
                        Loading report...
                    </div>
                )}
                <p className="mb-0">
                    <HelpOutlineIcon /> This code allows you to access this report at any time via 'Reports' section. Be sure to save it in a safe place.
                </p>
                <p>Report code <b>{reportCode}</b></p>
                <div className="d-flex flex-row justify-content-between w-100 mt-5">
                    <div>
                        <h1>Report</h1>
                        <p className="fs-5">Phase {projectPhase}</p>
                    </div>
                    <div className="text-end">
                        <p>Report created on <b>{creationTime}</b></p>
                        <p>Regarding the project <b>{projectName}</b></p>
                        <p>Organization  <b>{projectOrganization}</b></p>
                    </div>
                </div>
                <div className="text-center mb-4 w-100 justify-content-center margin-auto chart-container">
                    <h4 className="m-0"><b>Responsible Innovation Dimensions</b></h4>
                    <div className="mixed-chart" style={{ display: "flex", justifyContent: "center" }}>
                        <Chart
                            options={options}
                            series={series}
                            type="radar"
                            width="900"
                        />
                    </div>
                </div>
                <div className="mt-3">
                    <h3><b>Overall Score</b></h3>
                    <div className="d-flex flex-row justify-content-between mt-4">
                        <div className="d-flex flex-row align-items-center mb-2">
                            <h3>Responsibility Level  —
                                {recommendationLevel && (
                                    <span className="ms-2" style={{
                                        color: recommendationLevel.search("Low") >= 0 ? "#4daed2" :
                                            recommendationLevel.search("Medium") >= 0 ? "#008bbe" :
                                                recommendationLevel.search("High") >= 0 ? "#006185" : "000"
                                    }}>
                                        {recommendationLevel}
                                    </span>
                                )}
                            </h3>
                        </div>
                        <div>
                            <h3 className="">Score: <span className="fs-3"><b>{score}</b></span> <span className="text-body-tertiary fs-4">/ {maxScore}</span></h3>
                        </div>
                    </div>

                    <p className="mb-4 fs-5">The responsibility level is derived from the scores across all dimensions in the framework.</p>

                    <h4 className="mt-3  mb-4">General Recommendations</h4>
                    <p className="fs-5">{recommendation}</p>
                    <ReportCopilotPanel token={token} />
                    <ReportAnswers
                        dimensionsData={dimensionsData}
                        showAnswers={showAnswers}
                        setShowAnswers={setShowAnswers}
                        sanitizeSimple={sanitizeSimple}
                    />
                </div>
                {
                    loadedGeneralData && loadedChartData && loadedDimensionsData && loadedScoreData && (
                        <Suspense fallback={<p>Preparing PDF tools...</p>}>
                            <DownloadPDFButton
                                token={token}
                                creationTime={creationTime}
                                projectName={projectName}
                                projectOrganization={projectOrganization}
                                projectPhase={projectPhase}
                                projectAcronym={projectAcronym}
                                series={series}
                                options={options}
                                dimensionsData={dimensionsData}
                                score={score}
                                maxScore={maxScore}
                                recommendationLevel={recommendationLevel}
                                recommendation={recommendation}
                                sanitizeSimple={sanitizeSimple}
                            />
                        </Suspense>
                    )
                }
            </div >
        </div >
    );
};

export default Report;
