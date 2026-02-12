import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Home = () => {

    const navigate = useNavigate();

    return (
        <div className="w-100 h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#f0f0f0' }}>
            <div className="banner-section text-center" style={{ padding: '8rem 9.5rem 4rem 9.5rem' }}>
                <h1 className='main-title'>How responsible is your innovation?</h1>
                <p className='sub-title'>Take this self-assessment to find out the path to full responsibility.</p>
                <div className='w-100 text-center' style={{ marginBottom: '6rem' }}>
                    <button onClick={() => navigate('/assessment/')}
                        className='forms-button w-25'>
                        <p className='m-0 fs-5'>Start assessment</p>
                    </button>
                </div>
            </div>
            <div className='text-start mb-5' style={{ padding: '0 9.5rem 0 9.5rem' }}>
                <h2 className='fs-1 mb-3'><b>What is RIAT?</b></h2>
                <p className='fs-4'>The RIAT (Responsible Innovation Assessment Tool) is a self assessment and reflexive tool that introduces accountability among innovators, encouraging a proactive approach to address potential risks and unintended consequences of their innovation projects.</p>
            </div>
            <div className='text-start mb-5' style={{ padding: '0 9.5rem 0 9.5rem' }}>
                <h2 className='fs-1 mb-3'><b>What kinds of change is this process aiming to promote?</b></h2>
                <p className='fs-4'>This is an interactive process by which innovators assume a responsible approach towards innovation that creates change and positive impacts on society and the environment.</p>
                <p className='fs-4'>It does not intend to provoke judgments, but help reflect on impact and practices in a continuous improvement mode reaching 3 levels of responsibility: low, medium and high.</p>
            </div>
            <div className='w-100 text-center'>
                <img
                    src="/landing_page_img.png"
                    alt="Innovation Assessment"
                    className='w-100'
                />
            </div>
        </div>
    );
};

export default Home;