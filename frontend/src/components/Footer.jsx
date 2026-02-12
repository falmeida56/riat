import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const Footer = () => {

    const [isHomePage, setIsHomePage] = useState(false);
    const [isLoginRegister, setIsLoginRegiser] = useState(false);
    const currentPath = useLocation().pathname;

    useEffect(() => {
        const normalizedPath = currentPath.replace(/\/+$/, ''); // remove barras no fim

        if (normalizedPath === '') {
            setIsHomePage(true);
            setIsLoginRegiser(false);
        } else if (normalizedPath === '/login' || normalizedPath === '/register') {
            setIsHomePage(false);
            setIsLoginRegiser(true);
        } else {
            setIsHomePage(false);
            setIsLoginRegiser(false);
        }
    }, [currentPath]);


    return (
        <footer
            className={`bg-white text-black ${(isHomePage || isLoginRegister) ? '' : 'pb-2'}`}
            style={{ zIndex: 5 }}
        >
            <div
                className={(isHomePage || isLoginRegister) ? 'border-top border-secondary-subtle py-5' : 'border-top border-secondary-subtle py-2'}
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    alignItems: (isHomePage || isLoginRegister) ? '' : 'center',
                }}
            >
                {(isHomePage || isLoginRegister) && (
                    <div className="d-flex flex-row justify-content-center align-items-start me-2">
                        <img
                            src="/flag_eu.jpg"
                            alt="Innovation Assessment"
                            className="mx-4"
                        />
                        <p className='mb-0' style={{ fontSize: '0.75rem' }}>
                            This project has received funding from the European Union’s Horizon Europe research
                            and innovation programme under the Grant Agreement 101058385.
                            <br />
                            <br />
                            Views and opinions expressed are however those of the authors only and do not
                            necessarily reflect those of the European Union or Horizon Europe. Neither the
                            European Union nor the granting authority can be held responsible for them.
                        </p>
                    </div>
                )}
                {(isHomePage || isLoginRegister) ? (
                    <div className="d-flex flex-column align-items-end justify-content-end ms-2">
                        <div className="d-flex flex-row justify-content-between align-items-center mb-2">
                            <img
                                src="/FireRes_logo_300x75.png"
                                alt="FireRes_Logo"
                                className="mx-4"
                                style={{ width: '10rem' }}
                            />
                            <img
                                src="/INESCTEC_logo_COLOR.png"
                                alt="INESCTEC_logo_COLOR"
                                className="mx-4"
                                style={{ width: '10rem' }}
                            />
                        </div>
                        <p className="mb-0 me-4" style={{ fontSize: '0.75rem' }}>
                            Responsible Innovation Assessment Tool. Copyright © INESC TEC 2025
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="align-items-center ms-4">
                            <p className="mb-0" style={{ fontSize: '0.75rem' }}>
                                Responsible Innovation Assessment Tool. Copyright © INESC TEC 2025
                            </p>
                        </div>
                        <div className="d-flex flex-row align-items-center justify-content-end me-4">
                            <img
                                src="/FireRes_logo_300x75.png"
                                alt="FireRes_Logo"

                                style={{ width: '10rem' }}
                            />
                            <img
                                src="/INESCTEC_logo_COLOR.png"
                                alt="INESCTEC_logo_COLOR"

                                style={{ width: '10rem' }}
                            />
                        </div>
                    </>
                )}
            </div>
        </footer >
    );
}

export default Footer;