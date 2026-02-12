import { useUser } from "../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';


const Navbar = () => {

    const { user } = useUser();

    const navigate = useNavigate();

    return (
<nav className="navbar sticky-top border-bottom border-secondary-subtle" style={{ zIndex: 5, height: "10vh", backgroundColor: "white" }}>
    <a href="/" className="text-dark text-decoration-none ms-4 d-flex flex-column align-items-center">
        <img
            src="/logo_horizontal.svg"
            alt="RIAT Logo"
            style={{ height: "3.5rem" }}
        />
    </a>
            {user && user.user_role === 1 ? (
                <ul className="navbar-nav d-flex flex-row me-4 align-items-center">
                    <li className="nav-item mx-2 dropdown">
                        <button
                            className="btn btn-link nav-link d-flex align-items-center dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <AccountCircleIcon className="me-1" />
                            {user && user.user_email}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><a className="dropdown-item" href="/logout">Logout</a></li>
                        </ul>
                    </li>
                </ul>
            ) : (
                <ul className="navbar-nav d-flex flex-row me-3 align-items-center">
                    <li className="nav-item mx-2"><a className="nav-link" href="/projects">Projects</a></li>
                    <li className="nav-item mx-2"><a className="nav-link" href="/assessment">Assessments</a></li>
                    <li className="nav-item mx-2"><a className="nav-link" href="/reports">Reports</a></li>
                    <li className="nav-item mx-2 dropdown">
                        {user ? (
                            <button
                                className="btn btn-link nav-link d-flex align-items-center dropdown-toggle position-relative"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <AccountCircleIcon className="me-1" />
                                {user && user.user_email}
                            </button>
                        ) : (
                            <div className="d-flex align-items-center">
                                <button onClick={() => navigate('/login')} className="sign-in-button ms-2 d-flex align-items-center">
                                    Sign In
                                </button>
                                <button onClick={() => navigate('/register')} className="login-form-button ms-2 d-flex align-items-center">
                                    Register
                                </button>
                            </div>
                        )}
                        <ul className="dropdown-menu dropdown-menu-end position-absolute" style={{ maxWidth: "8rem" }}>
                            <li><a className="dropdown-item" href="/logout">Logout</a></li>
                        </ul>
                    </li>
                </ul>
            )
            }
        </nav >
    );
};

export default Navbar;