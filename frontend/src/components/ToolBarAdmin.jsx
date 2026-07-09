import { useUser } from "../contexts/UserContext";
import '../styles/admin.css';

const ToolBarAdmin = () => {

    const { user } = useUser();

    const currentPage = window.location.pathname.split('/')[1];

    const userRole = user ? user.user_role : null;

    return (
        <>
            {userRole === 1 && (
                <div
                    className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary z-3 position-fixed"
                    style={{ width: '16rem', height: '100vh' }}
                >
                    <a
                        className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"
                    >
                        <span className="fs-4 mt-4">Dashboard</span>
                    </a>
                    <ul className="nav nav-pills flex-column mb-auto gap-2 mt-4">
                        <li className="nav-item">
                            <a
                                href="/surveytools"
                                className={`nav-link ${currentPage === 'surveytools' || currentPage === 'surveyadmin' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'surveytools' || currentPage === 'surveyadmin' ? 'page' : undefined}
                            >
                                Assessments
                            </a>
                        </li>
                        <li>
                            <a
                                href="/projectsadmin"
                                className={`nav-link ${currentPage === 'projectsadmin' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'projects' ? 'page' : undefined}
                            >
                                Users & Projects
                            </a>
                        </li>
                        <li>
                            <a
                                href="/adminrequests"
                                className={`nav-link ${currentPage === 'adminrequests' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'requests' ? 'page' : undefined}
                            >
                                Requests
                            </a>
                        </li>
                        <li>
                            <a
                                href="/recommendationtools"
                                className={`nav-link ${currentPage === 'recommendationtools' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'recommendations' ? 'page' : undefined}
                            >
                                Recommendations
                            </a>
                        </li>
                        <li>
                            <a
                                href="/groundingreferences"
                                className={`nav-link ${currentPage === 'groundingreferences' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'groundingreferences' ? 'page' : undefined}
                            >
                                Grounding Sources
                            </a>
                        </li>
                        <li>
                            <a
                                href="/scaletools"
                                className={`nav-link ${currentPage === 'scaletools' ? 'selected-toolbar' : 'link-body-emphasis'
                                    }`}
                                aria-current={currentPage === 'scaletools' ? 'page' : undefined}
                            >
                                Scales
                            </a>
                        </li>
                    </ul>
                </div>
            )}
        </>
    );
};

export default ToolBarAdmin;
