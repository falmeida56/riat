import { lazy, Suspense } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import './styles/global.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ToolBarAdmin from './components/ToolBarAdmin';
import { UserProvider } from './contexts/UserContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SurveyTools = lazy(() => import('./pages/SurveyTools'));
const ProjectsAdmin = lazy(() => import('./pages/ProjectsAdmin'));
const ProjectsAdminDetail = lazy(() => import('./pages/ProjectsAdminDetail'));
const ScaleTools = lazy(() => import('./pages/ScaleTools'));
const SurveyAdmin = lazy(() => import('./pages/SurveyAdmin'));
const Projects = lazy(() => import('./pages/Projects'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Report = lazy(() => import('./pages/Report'));
const RequestsAdmin = lazy(() => import('./pages/RequestsAdmin'));
const Reports = lazy(() => import('./pages/Reports'));
const RecommendationTools = lazy(() => import('./pages/RecommendationTools'));
const GroundingReferences = lazy(() => import('./pages/GroundingReferences'));

const Logout = () => {
  localStorage.clear();
  return <Navigate to='/login' />;
};

const RegisterAndLogout = () => {
  localStorage.clear();
  return <Register />;
}


function App() {

  return (
    <UserProvider>
      <BrowserRouter>
        <div id="root">
          <Navbar />
          <ToolBarAdmin />
          <div className="main-content">
            <Suspense fallback={<div className="container mt-5">Loading...</div>}>
              <Routes>
                <Route path='/'
                  element={
                    <Home />
                  }
                />
                <Route path='/projects'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <Projects />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/assessment/' element={
                  <ProtectedRoute>
                    <ProjectProvider>
                      <Assessment />
                    </ProjectProvider>
                  </ProtectedRoute>
                } />
                <Route path='/assessment/:id'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <Assessment />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/report/:token'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <Report />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/reports/'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <Reports />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/surveytools'
                  element={<ProtectedRoute>
                    <SurveyTools />
                  </ProtectedRoute>}
                />
                <Route path='/projectsadmin'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <ProjectsAdmin />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/projectsadmin/:id'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <ProjectsAdminDetail />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/adminrequests'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <RequestsAdmin />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/recommendationtools'
                  element={<ProtectedRoute>
                    <ProjectProvider>
                      <RecommendationTools />
                    </ProjectProvider>
                  </ProtectedRoute>}
                />
                <Route path='/groundingreferences'
                  element={<ProtectedRoute>
                    <GroundingReferences />
                  </ProtectedRoute>}
                />
                <Route path='/surveyadmin/:id'
                  element={<ProtectedRoute>
                    <SurveyAdmin />
                  </ProtectedRoute>}
                />
                <Route path='/scaletools'
                  element={<ProtectedRoute>
                    <ScaleTools />
                  </ProtectedRoute>}
                />
                <Route path='/login' element={<Login />} />
                <Route path='/logout' element={<Logout />} />
                <Route path='/register' element={<RegisterAndLogout />} />
                <Route path='/forgotpassword' element={<ForgotPassword />} />
                <Route path='/resetpassword/:token' element={<ResetPassword />} />
                <Route path='*' element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App
