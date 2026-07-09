import { useEffect } from 'react';
import { useState } from 'react';

const DeleteDimensionDialog = ({ dialogRef, setDeletingDimension, id, handleDeleteDimension, dimensionName }) => {

    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
    }, [dialogRef]);

    const [inputValue, setInputValue] = useState('');

    return (
        <dialog className="dialog modal modal-content w-50" style={{ height: '40rem' }} ref={dialogRef}>
            <h2 className='mb-4'>Deleting Dimension</h2>
            <p className='fs-5'>Are you sure you want to delete this dimension? <b>This action cannot be undone</b>.</p>
            <p className='fs-5'>
                This action will have the following consequences:
                <ul>
                    <li className='my-2'>Removal of all <b>statements</b> related to this dimension;</li>
                    <li  className='my-2'>Removal of all <b>answers</b> related to this dimension;</li>
                    <li  className='my-2'>Removal of this dimension <b>from existing reports</b>;</li>
                    <li  className='my-2'>Removal of this dimension from <b>existing assessments</b>;</li>
                </ul>
            </p>
            <p className='fs-5'>Please insert the name of the dimension you're trying to delete to confirm it.</p>
            <form
                method="dialog"
                className="dialog-form w-100"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleDeleteDimension(id);
                }}
            >
                <input
                    name="statement_name"
                    type="text"
                    placeholder="Insert the dimension name"
                    required
                    className="form-control my-3"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                />
                {inputValue === dimensionName && (
                    <button type="submit" className="btn btn-danger mt-3">Confirm deletion</button>
                )}
                <div className='mt-3'>
                    <a className="close-btn" onClick={() => setDeletingDimension(false)}>Close</a>
                </div>
            </form>
        </dialog>
    );
}

export default DeleteDimensionDialog;
