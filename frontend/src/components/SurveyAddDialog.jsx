import { useEffect } from 'react';

const SurveyAddDialog = ({ dialogRef, setEditing, handleSurveySubmit }) => {

    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
    }, [dialogRef]);

    return (
        <dialog className="dialog" ref={dialogRef}>
            <button onClick={() => { setEditing(false); }}>Close</button>
            <form method="dialog" className="dialog-form" onSubmit={(e) => {
                e.preventDefault();
                handleSurveySubmit(e);
            }}>
                <h2>Create new assessment</h2>
                <label htmlFor="survey_name">Assessment Name</label>
                <textarea id="survey_name" name="survey_name" required></textarea>

                <label htmlFor="survey_description">Survey Description</label>
                <textarea id="survey_description" name="survey_description" required></textarea>

                <button type="submit">Submit</button>
            </form>
        </dialog>
    );
};

export default SurveyAddDialog;
