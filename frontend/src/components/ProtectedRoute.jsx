import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from "../contexts/UserContext";

function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const { setUser } = useUser();
    const hasLoggedOut = useRef(false);
    const logoutTimerRef = useRef(null);

    const logout = useCallback((showExpiredMessage = true) => {
        if (hasLoggedOut.current) return;
        hasLoggedOut.current = true;
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
        }

        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        localStorage.removeItem('user');
        if (showExpiredMessage) {
            alert('Your session has expired. Please log in again.');
        }
        setIsAuthorized(false);
        setUser(null);
    }, [setUser]);

    const scheduleLogout = useCallback((token) => {
        const decoded = jwtDecode(token);
        const expirationTime = decoded.exp;
        const now = Date.now() / 1000;
        const timeLeft = expirationTime - now;

        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
        }

        if (timeLeft > 0) {
            logoutTimerRef.current = setTimeout(() => {
                logout();
            }, timeLeft * 1000);
        } else {
            logout();
        }
    }, [logout]);

    const refreshToken = useCallback(async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (!refreshToken) return logout();

        try {
            const response = await api.post('/api/token/refresh/', {
                refresh: refreshToken,
            });
            if (response.status === 200) {
                const newAccess = response.data.access;
                localStorage.setItem(ACCESS_TOKEN, newAccess);
                scheduleLogout(newAccess);
                setIsAuthorized(true);
            } else {
                logout();
            }
        } catch {
            logout();
        }
    }, [logout, scheduleLogout]);

    const auth = useCallback(async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (!token) return logout(false);

        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        if (tokenExpiration < now) {
            await refreshToken();
        } else {
            scheduleLogout(token);
            setIsAuthorized(true);
        }
    }, [logout, refreshToken, scheduleLogout]);

    useEffect(() => {
        auth().catch(() => logout(true));

        return () => {
            if (logoutTimerRef.current) {
                clearTimeout(logoutTimerRef.current);
            }
        };
    }, [auth, logout]);

    if (isAuthorized === null) {
        return <div>Loading...</div>;
    }

    return isAuthorized ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
