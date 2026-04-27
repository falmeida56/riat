import { useState } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import api from "../api";

const ReportCopilotPanel = ({ token }) => {
    const [documentExcerpt, setDocumentExcerpt] = useState("");
    const [copilotPlan, setCopilotPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.post(`/api/report/copilot/${token}/`, {
                document_excerpt: documentExcerpt,
            });
            setCopilotPlan(response.data.plan);
        } catch (err) {
            const message = err.response?.data?.error || "Could not generate the AI-assisted improvement plan.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const renderList = (title, items, renderItem) => {
        if (!items || items.length === 0) {
            return null;
        }

        return (
            <div className="mb-4">
                <h5 className="mb-3"><b>{title}</b></h5>
                <div className="d-flex flex-column gap-3">
                    {items.map((item, index) => (
                        <div key={`${title}-${index}`} className="border-start border-3 ps-3">
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <section className="mt-5 p-4 border rounded-2 bg-light">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                <div>
                    <h3 className="d-flex align-items-center gap-2 mb-2">
                        <AutoAwesomeIcon />
                        <b>RIAT Copilot</b>
                    </h3>
                    <p className="mb-0">
                        Generate an AI-assisted improvement plan from this RIAT assessment. It works with the report alone
                        and can optionally use project text to make the advice more specific.
                    </p>
                </div>
                <div className="d-flex align-items-start">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? "Generating..." : "Generate improvement plan"}
                    </button>
                </div>
            </div>

            <textarea
                className="form-control mt-4"
                rows="5"
                maxLength="12000"
                value={documentExcerpt}
                onChange={(event) => setDocumentExcerpt(event.target.value)}
                placeholder="Optional: paste a short proposal excerpt, deliverable excerpt, impact/governance text, or internal project note."
            />
            <div className="text-end text-muted mt-1">
                {documentExcerpt.length} / 12000
            </div>

            {error && (
                <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {error}
                </div>
            )}

            {copilotPlan && (
                <div className="mt-4">
                    {copilotPlan.generated_by === "riat_fallback" && (
                        <div className="alert alert-info" role="alert">
                            Prototype mode: this draft was generated from the RIAT assessment because an external LLM response was not available.
                        </div>
                    )}

                    {renderList("Priority gaps", copilotPlan.priority_gaps, (item) => (
                        <>
                            <p className="mb-1"><b>{item.dimension}</b></p>
                            <p className="mb-0">{item.why_it_matters}</p>
                        </>
                    ))}

                    {renderList("Recommended actions", copilotPlan.recommended_actions, (item) => (
                        <>
                            <p className="mb-1"><b>{item.action}</b></p>
                            <p className="mb-0">{item.detail}</p>
                        </>
                    ))}

                    {renderList("Evidence to collect", copilotPlan.evidence_to_collect, (item) => (
                        <p className="mb-0">{item}</p>
                    ))}

                    {copilotPlan.proposal_or_impact_language && (
                        <div className="mb-4">
                            <h5 className="mb-3"><b>Proposal or impact language</b></h5>
                            <p className="mb-0">{copilotPlan.proposal_or_impact_language}</p>
                        </div>
                    )}

                    {renderList("Responsible AI notes", copilotPlan.responsible_ai_notes, (item) => (
                        <p className="mb-0">{item}</p>
                    ))}

                    {renderList("Review caveats", copilotPlan.review_caveats, (item) => (
                        <p className="mb-0 text-muted">{item}</p>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ReportCopilotPanel;
