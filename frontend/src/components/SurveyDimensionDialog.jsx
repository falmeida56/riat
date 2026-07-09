import { useEffect } from 'react';

const SurveyDimensionDialog = ({ allDimensions, dialogRef, setEditing, id, handleDimensionSubmit }) => {

    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
    }, [dialogRef]);

    return (
        <dialog className="dialog modal modal-content w-50" style={{ height: '42rem' }} ref={dialogRef}>
            <form method="dialog" className="dialog-form w-100" onSubmit={(e) => {
                e.preventDefault();
                handleDimensionSubmit(e, id);
            }}>
                <h2 className='mb-4'>Add New Dimension</h2>
                <textarea
                    id="dimension_name"
                    name="dimension_name"
                    className="form-control my-3"
                    required
                    placeholder="Enter the dimension name"
                ></textarea>
                <textarea
                    id="dimension_short_description"
                    name="dimension_short_description"
                    className="form-control my-3"
                    required
                    placeholder="Enter a short description"
                ></textarea>
                <textarea
                    id="dimension_description"
                    name="dimension_description"
                    className="form-control my-3"
                    required
                    placeholder="Enter a detailed description"
                ></textarea>
                <div className='mt-4'>
                    <label htmlFor="parent_dimension"><b>Parent Dimension (optional)</b></label>
                    <select
                        id="parent_dimension"
                        name="parent_dimension"
                        className="form-control my-3"
                        defaultValue=""
                    >
                        <option value="">None</option>
                        {allDimensions.map((dim) => (
                            <option key={dim.id_dimensions} value={dim.id_dimensions}>
                                {dim.dimension_name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="btn btn-primary mt-3">Create Dimension</button>
                <div className='mt-3'>
                    <a className="close-btn" onClick={() => setEditing(false)}>Close</a>
                </div>
            </form>
        </dialog>
    );
}

export default SurveyDimensionDialog;
