import { useEffect } from 'react';
import { useState } from 'react';

const DeleteStatementDialog = ({ dialogRef, setDeletingStatement, id, handleDeleteStatement }) => {

    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
    }, [dialogRef]);

    const [inputValue, setInputValue] = useState('');

    return (
        <dialog className="dialog modal modal-content w-50" style={{ height: '35rem' }} ref={dialogRef}>
            <h2 className='mb-4'>Deleting Statement</h2>
            <p className='fs-5'>Are you sure you want to delete this statement? <b>This action cannot be undone</b>.</p>
            <p className='fs-5'>
                This action will have the following consequences:
                <ul>
                    <li  className='my-2'>Removal of all <b>answers</b> related to this dimension;</li>
                    <li  className='my-2'>Removal of this statement <b>from existing reports</b>;</li>
                    <li  className='my-2'>Removal of this statement from <b>existing assessments</b>;</li>
                </ul>
            </p>
            <p className='fs-5'>Please <b>write 'confirm'</b> to conclude the deletion.</p>
            <form
                method="dialog"
                className="dialog-form w-100"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleDeleteStatement(id);
                }}
            >
                <input
                    name="statement_name"
                    type="text"
                    required
                    className="form-control my-3"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                />
                {inputValue === 'confirm' && (
                    <button type="submit" className="btn btn-danger mt-3">Confirm deletion</button>
                )}
                <div className='mt-3'>
                    <a className="close-btn" onClick={() => setDeletingStatement(false)}>Close</a>
                </div>
            </form>
        </dialog>
    );
}

export default DeleteStatementDialog;
