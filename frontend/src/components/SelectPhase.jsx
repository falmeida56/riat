import { useProject } from "../contexts/ProjectContext";
import { useState } from "react";

const SelectPhase = () => {

    const { projectPhase, setProjectPhase } = useProject();
    const selectedPhase = String(projectPhase || '');

    const [initialPhase] = useState(projectPhase);


    return (
        <div className="global-container">
            <div className="create-project-container">
                <h1>What phase is your project in?</h1>
                <p>This will help us tailor the questions to your current needs.</p>

                <div className="radio-group">
                    <label
                        htmlFor="option1"
                        className={`radio-label border-1 py-4 px-3 rounded-2 my-2 ${selectedPhase === "1" ? "" : "bg-light "
                            }`}
                        style={selectedPhase === "1" ? { backgroundColor: "#64c8eb" } : {}}
                    >
                        <input
                            className="radio-input"
                            type="radio"
                            name="phase"
                            id="option1"
                            value="1"
                            checked={selectedPhase === "1"}
                            disabled={parseInt(initialPhase, 10) > 1}

                            onChange={(e) => setProjectPhase(e.target.value)}
                        />
                        <p className="mb-0 ms-3"><b>Phase 1</b> - At the beginning of the project planning while defining the scope and engaging the project team</p>
                    </label>
                    <label
                        htmlFor="option2"
                        className={`radio-label border-1 py-4 px-3 rounded-2 my-2 ${selectedPhase === "2" ? "" : "bg-light "
                            }`}
                        style={selectedPhase === "2" ? { backgroundColor: "#64c8eb" } : {}}
                    >
                        <input
                            className="radio-input"
                            type="radio"
                            name="phase"
                            id="option2"
                            value="2"
                            checked={selectedPhase === "2"}
                            disabled={parseInt(initialPhase, 10) >= 2}
                            onChange={(e) => setProjectPhase(e.target.value)}
                        />
                        <p className="mb-0 ms-3"><b>Phase 2</b> - During project development (with at least 25% of project activities executed, before testing and it is recommended to repeat RIAT every 6 months)</p>
                    </label>
                    <label
                        htmlFor="option3"
                        className={`radio-label border-1 py-4 px-3 rounded-2 my-2 ${selectedPhase === "3" ? "" : "bg-light"
                            }`}
                        style={selectedPhase === "3" ? { backgroundColor: "#64c8eb" } : {}}
                    >
                        <input
                            className="radio-input"
                            type="radio"
                            name="phase"
                            id="option3"
                            value="3"
                            checked={selectedPhase === "3"}
                            onChange={(e) => setProjectPhase(e.target.value)}
                        />
                        <p className="mb-0 ms-3"><b>Phase 3</b> - At the end of the project, before launching the project results and go-to-market</p>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SelectPhase;
