import { useEffect } from 'react';

const DimensionStatementDialog = ({ dialogRef, setAddStatement, id, handleStatementSubmit, allScales }) => {

    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
    }, [dialogRef]);

    return (
        <dialog className="dialog modal modal-content w-50" style={{ height: '30rem' }} ref={dialogRef}>
            <h2 className='mb-4'>Add New Statement</h2>
            <form
                method="dialog"
                className="dialog-form w-100"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleStatementSubmit(e, id);
                    setAddStatement(false);
                }}
            >
                <textarea
                    name="statement_name"
                    type="text"
                    placeholder="Statement Name"
                    required
                    className="form-control my-3"
                />
                <textarea
                    name="statement_description"
                    placeholder="Statement Description"
                    className="form-control my-3"
                />
                <select
                    name="scales_id_scales"
                    defaultValue=""
                    required
                    className="form-control my-3"
                >
                    <option value="" disabled>Select scale</option>
                    {allScales.map(scale => (
                        <option key={scale.id_scales} value={scale.id_scales}>
                            {scale.scale_name}
                        </option>
                    ))}
                </select>
                <button type="submit" className="btn btn-primary mt-3">Create Statement</button>
                <div className='mt-3'>
                    <a className="close-btn" onClick={() => setAddStatement(false)}>Close</a>
                </div>
            </form>
        </dialog>
    );
}

export default DimensionStatementDialog;
