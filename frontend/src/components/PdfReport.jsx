import React, { useRef, useState } from 'react';
import { pdf, Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import Chart from "react-apexcharts";
import html2canvas from 'html2canvas';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 12,
        fontFamily: 'Helvetica',
    },
    firstSection: {
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    firstSectionDetails: {
        display: 'flex',
        flexDirection: 'column',
    },
    detailsText: {
        fontSize: 8,
        marginBottom: 4,
    },
    dimensionTitle: {
        fontSize: 14,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    dimesionDescription: {
        fontSize: 10,
        marginBottom: 10,
        lineHeight: 1.5,
    },
    statementTitle: {
        fontSize: 11,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    statementDescription: {
        fontSize: 11,
        marginBottom: 10,
        lineHeight: 1.5,
        fontStyle: 'italic',
    },
    border: {
        borderBottom: '2px solid #DEE2E6',
        marginBottom: 10,
        marginTop: 10,
    },
    scaleLabelsContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    scaleLabels: {
        fontSize: 9,
        color: '#000',
        display: 'inline-block',
        marginLeft: 5,
    },
    answerContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
    answerLabel: {
        fontSize: 9,
        color: '#006C8E',
        display: 'inline-block',
        marginLeft: 5,
        fontWeight: 'bold',
        backgroundColor: '#DEE2E6',
        padding: 2.5,
    },
    dot: {
        height: 4,
        width: 4,
        backgroundColor: '#0091BE',
        display: 'inline-block',
    },
    scoreFirstSection: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    scoreTitleText: {
        fontSize: 14,
        color: '#000',
        display: 'inline-block',
    },
    scoreContainer: {
        display: 'flex',
        flexDirection: 'row',
    },
    scoreText: {
        fontSize: 17,
        color: '#000',
        display: 'inline-block',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    maxScoreText: {
        fontSize: 14,
        color: '#A4A4A4',
        display: 'inline-block',
        marginLeft: 5,
    },
    title: {
        fontSize: 20,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 13,
    },
    responsibilityLevelTextLabel: {
        fontSize: 14,
        color: '#000',
        display: 'inline-block',
    },
    responsibilityLevelTextBad: {
        fontSize: 14,
        color: '#4daed2',
        display: 'inline-block',
        marginLeft: 5,
    },
    responsibilityLevelTextMedium: {
        fontSize: 14,
        color: '#008bbe',
        display: 'inline-block',
        marginLeft: 5,
    },
    responsibilityLevelTextGood: {
        fontSize: 14,
        color: '#006185',
        display: 'inline-block',
        marginLeft: 5,
    },
    infoText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    paragraph: {
        marginBottom: 8,
        lineHeight: 1.5,
    },
    chartImage: {
        width: '100%',
        objectFit: 'contain',
        marginTop: 10,
    },
    boldText: {
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 5,
        padding: 10,
    },
    freeText: {
        fontSize: 10,
        color: '#006C8E',
        fontWeight: 'bold',
    },
    preferNotToAnswer: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});

const renderStrongText = (html, styles) => {
    const parts = html.split(/(<strong>|<\/strong>)/gi);
    let isBold = false;

    return (
        <Text style={styles.statementDescription}>
            {parts.map((part, index) => {
                if (part.toLowerCase() === '<strong>') {
                    isBold = true;
                    return null;
                }
                if (part.toLowerCase() === '</strong>') {
                    isBold = false;
                    return null;
                }

                return (
                    <Text key={index} style={isBold ? styles.boldText : {}}>
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
};


const ReportDocument = ({
    token,
    creationTime,
    projectName,
    projectOrganization,
    projectPhase,
    chartImage,
    dimensionsData,
    score,
    maxScore,
    recommendationLevel,
    recommendation
}) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.detailsText}>{token}</Text>
            <View style={styles.firstSection}>
                <View>
                    <Text style={styles.title}>Responsible Innovation Report</Text>
                    <Text>Phase {projectPhase}</Text>
                </View>
                <View style={styles.firstSectionDetails} >
                    <Text style={styles.detailsText}>Report created on: <Text style={styles.boldText}>{creationTime}</Text></Text>
                    <Text style={styles.detailsText}>Regarding the project: <Text style={styles.boldText}>{projectName}</Text></Text>
                    <Text style={styles.detailsText}>Organization: <Text style={styles.boldText}>{projectOrganization}</Text></Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.subtitle}>Responsible Innovation Dimensions</Text>
                {chartImage && <Image style={styles.chartImage} src={chartImage} />}
            </View>

            <View style={styles.section}>
                <Text style={styles.subtitle}>Overall Score</Text>
                <View style={styles.scoreFirstSection}>
                    <Text style={styles.responsibilityLevelTextLabel}>Responsibility Level  — &nbsp;
                        <Text style={
                            recommendationLevel.search("Low") ? styles.responsibilityLevelTextBad :
                                recommendationLevel.search("Medium") ? styles.responsibilityLevelTextMedium :
                                    recommendationLevel.search("High") ? styles.responsibilityLevelTextGood : styles.responsibilityLevelTextLabel}>
                            {recommendationLevel}
                        </Text>
                    </Text>
                    <View style={styles.scoreContainer}>
                        <Text style={styles.responsibilityLevelTextLabel}>Score: <Text style={styles.scoreText}>{score}</Text><Text style={styles.maxScoreText}>/ {maxScore}</Text></Text>
                    </View>
                </View>
                <View style={{ marginBottom: 15 }}>
                    <Text style={styles.infoText}>
                        The responsibility level is derived from the scores across all dimensions in the framework.
                    </Text>
                </View>
                <View style={{ marginTop: 10 }}>
                    <Text>{recommendation}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.subtitle}>Answers</Text>
                {dimensionsData.map((dimension, dimIndex) => (
                    <View key={dimension.id} style={{ marginBottom: 15 }}>
                        <Text style={styles.dimensionTitle}>{dimIndex + 1}. {dimension.name}</Text>
                        {dimension.short_description !== dimension.description && (
                            <Text style={styles.dimesionDescription}>{dimension.short_description}</Text>
                        )}
                        <Text style={styles.dimesionDescription}>{dimension.description}</Text>

                        {dimension.statements.map((statement, stmtIndex) => (
                            <View key={statement.id} style={{ marginBottom: 10 }}>
                                <Text style={styles.statementTitle}>
                                    {dimIndex + 1}.{stmtIndex + 1}. {statement.name}
                                </Text>
                                {renderStrongText(statement.description, styles)}

                                {statement.answers.map((answer, answerIndex) => {
                                    const scaleLabels = statement.scale_labels?.split(',') || [];
                                    const selectedValue = answer?.value;

                                    if (statement.scale_labels && statement.scale_labels !== 'n/a' && scaleLabels.includes(selectedValue)) {
                                        return (
                                            <View key={answer.id || answerIndex} style={styles.scaleLabelsContainer}>
                                                {statement.scale_labels.split(",").map((label, index) => (
                                                    <Text
                                                        key={index}
                                                        style={
                                                            label === statement.answers[0]?.value
                                                                ? { ...styles.answerLabel, display: 'flex', alignItems: 'center' }
                                                                : styles.scaleLabels
                                                        }
                                                    >
                                                        {label}
                                                    </Text>
                                                ))}
                                            </View>
                                        );
                                    } else if (statement.scale_labels && statement.scale_labels !== 'n/a') {
                                        return (
                                            <View key={answer.id || answerIndex} style={{ marginTop: 4 }}>
                                                <Text style={styles.preferNotToAnswer}>Prefer not to answer</Text>
                                                <Text style={styles.freeText}>{selectedValue}</Text>
                                            </View>
                                        );
                                    } else {
                                        return (
                                            <View key={answer.id || answerIndex} style={{ marginTop: 4 }}>
                                                <Text style={styles.freeText}>{selectedValue}</Text>
                                            </View>
                                        );
                                    }
                                })}
                            </View>
                        ))}
                        {dimIndex !== dimensionsData.length - 1 && (
                            <View style={styles.border}></View>
                        )}
                    </View>
                ))}
            </View>
        </Page>
    </Document >
);

const DownloadPDFButton = ({ series, options, ...props }) => {
    const chartRef = useRef();
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);

        const chartCanvas = chartRef.current;
        const canvas = await html2canvas(chartCanvas);
        const chartImage = canvas.toDataURL('image/png');

        const blob = await pdf(
            <ReportDocument chartImage={chartImage} {...props} />
        ).toBlob();

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Report_${props.projectAcronym}_phase${props.projectPhase}.pdf`;
        link.click();

        setLoading(false);
    };

    return (
        <>
            {/* Hidden chart renderer */}
            <div ref={chartRef} style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <Chart
                    options={{
                        ...options,
                        chart: {
                            ...options.chart,
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
                        },
                        dataLabels: {
                            enabled: true,
                            formatter: (val) => `${val}%`,
                            background: {
                                enabled: true,
                                borderRadius: 2,
                            },
                            style: {
                                fontSize: '14px',
                            }
                        },
                        xaxis: {
                            ...options.xaxis,
                            labels: {
                                ...options.xaxis.labels,
                                style: {
                                    fontSize: '18px',
                                    colors: new Array(30).fill('#002d46'),
                                },
                                offsetY: 0,
                            },
                        },
                    }}
                    series={series}
                    type="radar"
                    width="1150"
                />
            </div>

            <button onClick={handleDownload} disabled={loading} className='forms-button'>
                {loading ? 'Generating PDF...' : 'Save Report as PDF'}
            </button>
        </>
    );
};


export default DownloadPDFButton;
