import { useEffect, useState } from "react";
import ProjectsAdminTable from "../components/ProjectsAdminTable";
import ProjectsAdminDetail from "../components/ProjectsAdminDetail";
import api from "../api";


const ProjectsAdmin = () => {

    // existing projects 
    const [projects, setProjects] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage, setProjectsPerPage] = useState(10);

    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    const currentProjects = projects.slice(indexOfFirstProject, indexOfLastProject);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const totalPages = Math.ceil(projects.length / projectsPerPage);



    // select single project

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    const handleProjectClick = (projectId) => {
        setSelectedProjectId(projectId);

        const project = projects.find((project) => project.id_projects === projectId);
        if (project) {
            setSelectedProject(project);
        } else {
            console.error("Project not found:", projectId);
        }
    }

    const handleBackClick = () => {
        setSelectedProjectId(null);
        setSelectedProject(null);
    }

    useEffect(() => {
        const getProjects = async () => {
            try {
                const response = await api.get("api/projects/get/");
                setProjects(response.data);
            } catch (error) {
                console.error("Error fetching projects:", error);
            }
        };

        getProjects();
    }, []);


    return (
        currentProjects.length > 0 && selectedProjectId === null ? (
            <ProjectsAdminTable
                currentProjects={currentProjects}
                paginate={paginate}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                projectsPerPage={projectsPerPage}
                setProjectsPerPage={setProjectsPerPage}
                handleProjectClick={handleProjectClick}
                setSelectedProjectId={setSelectedProjectId}
            />
        ) : selectedProjectId !== null ? (
            <ProjectsAdminDetail selectedProject={selectedProject} handleBackClick={handleBackClick} />
        ) : (
            <p>No projects available.</p>
        )

    );
}

export default ProjectsAdmin;
