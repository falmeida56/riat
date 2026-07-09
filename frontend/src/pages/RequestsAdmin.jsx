import React, { useEffect, useState } from 'react';
import api from '../api';

const RequestsAdmin = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionDone, setActionDone] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const response = await api.get('/api/projects/pendingrequests/');

                setRequests(response.data);
            } catch (error) {
                alert(error);
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [actionDone]);

    const handleRequestApproval = async (id) => {

        try {
            await api.post(`api/projects/requests/decision/${id}/`);
            setActionDone(true);
        } catch (error) {
            alert(error);
            console.error(error);
        }
    }

    const handleRequestRefusal = async (id) => {

        try {
            await api.delete(`api/projects/requests/decision/${id}/`);
            setActionDone(true);
        } catch (error) {
            alert(error);
            console.error(error);
        } finally {
            setActionDone(false);
        }

    }

    if (loading) return <div className="container mt-5" style={{ marginLeft: '16rem', maxWidth: 'calc(100% - 16rem)', overflowX: 'auto', minHeight: 'calc(100vh - 20vh)' }}>Loading pending requests...</div>;

    return (
        <div className="container mt-5" style={{ marginLeft: '16rem', maxWidth: 'calc(100% - 16rem)', overflowX: 'auto', minHeight: 'calc(100vh - 20vh)' }}>
            <h1 className="mb-4 ms-4">Pending requests</h1>
            {requests.length === 0 ? (
                <p>No pending requests.</p>
            ) : (
                <div className='mx-4'>
                    <table className='table table-responsive text-left align-middle shadow-sm border-2' style={{ maxWidth: '100%', borderRadius: '0.5rem', borderCollapse: 'separate' }}>
                        <thead className='align-top' style={{ fontWeight: 'regular' }}>
                            <tr style={{ height: '6rem' }}>
                                <th className='table-headers-text pt-4 ps-4'>User (is requesting access to)</th>
                                <th className='table-headers-text pt-4'>Project</th>
                                <th className='table-headers-text pt-4'>Owned by</th>
                                <th className='table-headers-text pt-4'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((request, index) => (
                                <tr key={index}>
                                    <td className='ps-4 py-3'><b>{request.request_user.email}</b> with <em>{request.request_user.role}</em> role and <em>{request.request_user.function}</em> function</td>
                                    <td>{request.id_projects}. {request.project_name}</td>
                                    <td>{request.owner.email}</td>
                                    <td>
                                        <button
                                            onClick={() => handleRequestApproval(request.id_users_has_projects)}
                                            className='new-assessment-button'
                                        >
                                            <p className='m-0 text-decoration-underline text-success'>Accept</p>
                                        </button>
                                        <button
                                            onClick={() => handleRequestRefusal(request.id_users_has_projects)}
                                            className='new-assessment-button'
                                        >
                                            <p className='m-0 text-decoration-underline text-danger'>Refuse</p>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div >
            )
            }
        </div >
    );
};

export default RequestsAdmin;
