import React, {useEffect, useMemo, useState} from "react";
import LoginPopup from "./components/LoginPopup";
import ReactDOM from "react-dom";
import {translations} from "./translations";
import {Language} from "./types";
import ImageEditor from "../ImageEditor";
import {getUsername, verifyToken} from "../UserAccessLevel";

const MainCodeIndex: React.FC = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [language, setLanguage] = useState<Language>("ru");
    const currentTranslation = translations[language] ?? translations["ru"];
    const [iconReady, setIconReady] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1090);
    const [accessUsername, setUsername] = useState<string | null>(null);
    // console.log(authToken);

    useEffect(() => {
        if (authToken) {
            const decoded = getUsername(); // ты можешь просто вызвать свой getUsername()
            setUsername(decoded);
        } else {
            setUsername(null);
        }
    }, [authToken]);

    useEffect(() => {
        const savedIcon = localStorage.getItem('userIcon');
        if (!savedIcon) setIconReady(false);

        verifyToken().then(isValid => {
            if (isValid) {
                setAuthToken(localStorage.getItem('authToken')); // токен нормальный
            } else {
                setAuthToken(null); // токен невалидный, очищаем
                setUsername(null);
                setIconReady(false);
            }
        });
    }, []);

    useEffect(() => {
        // Применяем сохранённые настройки языка при загрузке
        const langSetting = localStorage.getItem('changed-lang');
        if (langSetting === 'enabled') {
            setLanguage("en");
        } else {
            setLanguage("ru");
        }
    }, []);

    useEffect(() => {
        const handleLanguageChange = (event: Event) => {
            const newLang = (event as CustomEvent<string>).detail as Language; // Приведение типа
            if (newLang) {
                setLanguage(newLang);
            }
        };

        window.addEventListener("languageUpdateEvent", handleLanguageChange);
        return () => window.removeEventListener("languageUpdateEvent", handleLanguageChange);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userIcon");
        setUsername(null);
        setIconReady(false);
        window.location.href = 'index.html';
    };

    const getFirstAndLastLetters = (username?: string | null): string => {
        if (!username) return 'ME'; // Fallback для null/undefined

        // Удаляем все не-буквы из username
        const lettersOnly = username.replace(/[^a-zA-Z]/g, '');

        // Берем первую и последнюю букву (или fallback)
        const firstChar = lettersOnly.charAt(0).toUpperCase() || 'M';
        const lastChar = lettersOnly.slice(-1).toUpperCase() || 'E';

        return firstChar + lastChar;
    };

    const firstLastLetters = useMemo(() => getFirstAndLastLetters(accessUsername), [accessUsername]);

    // const letter = (accessUsername?.charAt(0).toUpperCase() || "M") + (accessUsername?.charAt(accessUsername?.length - 1).toUpperCase() || "E");

    return (
        <>
            {isMobile ? (
                <>
                    {document.querySelector('.header__up-blocks__wrapper__list') &&
                        (localStorage.getItem("authToken") != null) &&
                        ReactDOM.createPortal(
                            <button
                                className="header__up-blocks__wrapper__list__btn"
                                onClick={() => handleLogout()}
                            >
                                {currentTranslation.exit}
                            </button>,
                            document.querySelector('.header__up-blocks__wrapper__list') as Element
                        )
                    }
                </>
            ) : (
                <>
                    {document.querySelector(".header__up-blocks__wrapper__list") &&
                        ReactDOM.createPortal(
                            <>
                                <a className="header__up-blocks__wrapper__list__btn" href="./main.html"
                                   data-key="schedule">{currentTranslation.schedule}</a>
                                <a className="header__up-blocks__wrapper__list__btn" href="./project.html"
                                   data-key="projects">{currentTranslation.project}</a>
                            </>,
                            document.querySelector(".header__up-blocks__wrapper__list") as Element
                        )}

                    {document.querySelector('.header__up-blocks__wrapper__list') &&
                        (localStorage.getItem("authToken") != null) &&
                        ReactDOM.createPortal(
                            <button
                                className="header__up-blocks__wrapper__list__btn"
                                onClick={() => handleLogout()}
                            >
                                {currentTranslation.exit}
                            </button>,
                            document.querySelector('.header__up-blocks__wrapper__list') as Element
                        )
                    }
                </>
            )}

            {!authToken ? (
                <button
                    className="header__up-blocks__wrapper__btn"
                    onClick={() => setShowLogin(true)}>{currentTranslation.login}</button>
            ) : (
                <>
                    {document.querySelector(".header__up-blocks__wrapper_icon-place") &&
                        ReactDOM.createPortal(
                            (localStorage.getItem('userIcon') ? (
                                // <div className="header__up-blocks__wrapper__icon"></div>
                                <img
                                    src={localStorage.getItem('userIcon')!}
                                    className='header__up-blocks__wrapper__icon_gen'
                                    alt="User Icon"/>
                            ) : (
                                accessUsername && ( // <== ДОБАВИТЬ ПРОВЕРКУ!
                                    <ImageEditor
                                        src="account.png"
                                        letter={getFirstAndLastLetters(accessUsername)}
                                        onRender={(dataUrl) => {
                                            localStorage.setItem('userIcon', dataUrl);
                                            setIconReady(true);
                                        }}
                                    />
                                )
                            )),
                            document.querySelector(".header__up-blocks__wrapper_icon-place") as Element
                        )}

                    {document.querySelector(".header__up-blocks__menu-toggle-place") &&
                        ReactDOM.createPortal(
                            <div className="header__up-blocks__menu-toggle">☰</div>,
                            document.querySelector(".header__up-blocks__menu-toggle-place") as Element
                        )}
                </>
            )}

            {showLogin && (
                <LoginPopup
                    onClose={() => setShowLogin(false)}
                    onLoginSuccess={(token) => {
                        setAuthToken(token);
                        // console.log('Вошли с токеном:', token);
                    }}
                    currentTranslation={currentTranslation}
                />
            )}
        </>
    );
}

export default MainCodeIndex;
