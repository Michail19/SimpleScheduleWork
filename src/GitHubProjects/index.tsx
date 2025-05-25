import React, {useState, useEffect, useRef, useMemo} from 'react';
import {Octokit} from '@octokit/core';
import ReactDOM from "react-dom";
import {translations} from "./translations";
import {Employee, Language} from "./types";
import {SearchProjectPopup} from "./components/SearchProjectPopup";
import ProjectDetailsPopup from "./components/ProjectDetailsPopup";
import EmployeeManagementPopup from "./components/EmployeeManagementPopup";
import {getUserAccessLevel, verifyToken} from "../UserAccessLevel";
import BlockLoader, {touch_on_load} from "../BlockLoader";

interface GitHubRepo {
    id: number;
    name: string;
    html_url: string;
    description: string | null;
    updated_at: string;
    language: string | null;
    stargazers_count: number;
    employees?: {
        id: number;
        fio: string;
    }[];
}

interface MergedProject extends GitHubRepo {
    employees: Employee[]; // Используем единый тип Employee
}

const GitHubProjects: React.FC = () => {
    const [repos, setRepos] = useState<MergedProject[]>([]);
    const [username] = useState<string>('Michail19');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeProject, setActiveProject] = useState<MergedProject | null>(null); // Для DetailsPopup
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [language, setLanguage] = useState<Language>("ru");
    const currentTranslation = translations[language] ?? translations["ru"];
    const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isEmployeePopupOpen, setIsEmployeePopupOpen] = useState(false);
    const [currentProjectForEdit, setCurrentProjectForEdit] = useState<MergedProject | null>(null); // Для EmployeePopup
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1090);
    const [updateKey, setUpdateKey] = useState(0);
    const accessLevel = getUserAccessLevel() || "OWNER";
    const [load, setLoad] = React.useState(true);

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
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const octokit = new Octokit();
            const token = localStorage.getItem('authToken'); // 🔐 Получаем токен

            if (token) {
                if (!await verifyToken()) {
                    // Показываем alert с сообщением
                    alert(currentTranslation.old_session);

                    // Через небольшой таймаут (для UX) делаем редирект
                    setTimeout(() => {
                        handleLogout();
                        window.location.href = 'index.html';
                    }, 100); // 100мс - пользователь успеет увидеть сообщение

                    return; // <<< ДОБАВИТЬ! Прерываем функцию
                }
            }

            try {
                if (!token) throw new Error('Server responded with error');

                // 1. Пробуем получить данные с сервера с авторизацией
                const [repoResponse, serverResponse] = await Promise.all([
                    octokit.request('GET /users/{username}/repos', {
                        username: 'Michail19',
                        sort: 'updated',
                        per_page: 100,
                    }),
                    fetch('https://ssw-backend.onrender.com/projects/all', {
                        headers: {
                            "Authorization": `Bearer ${token}`, // 🔐 токен добавляется
                        },
                    }),
                ]);

                if (!serverResponse.ok) throw new Error('Server responded with error');

                const gitRepos = repoResponse.data as GitHubRepo[];
                const employeeData = await serverResponse.json();
                const projects = employeeData?.employees ?? {};

                const filteredRepos = gitRepos.filter(
                    (repo) =>
                        repo.name.toLowerCase() !== 'michail19' &&
                        repo.name.toLowerCase() !== 'readme'
                );

                const merged = filteredRepos.map((repo) => {
                    console.log('REPO:', repo.name, '| EMPLOYEES:', projects[repo.name]);
                    const matchedEmployees = projects[repo.name] || [];
                    return {
                        ...repo,
                        employees: matchedEmployees,
                    };
                });

                setRepos(merged);
            } catch (error) {
                console.warn('Ошибка при получении с сервера, fallback на JSON-файл', error);

                const jsonFallbackPath =
                    process.env.NODE_ENV === "production"
                        ? "https://raw.githubusercontent.com/Michail19/SimpleSheduleWork/refs/heads/react-dev/public/data/data_example_projects.json"
                        : "/data/data_example_projects.json";

                try {
                    // 2. Если сервер не доступен — fallback на JSON
                    const [repoResponse, fallbackResponse] = await Promise.all([
                        octokit.request('GET /users/{username}/repos', {
                            username: 'Michail19',
                            sort: 'updated',
                            per_page: 100,
                        }),
                        fetch(jsonFallbackPath),
                    ]);

                    const gitRepos = repoResponse.data as GitHubRepo[];
                    const employeeData = await fallbackResponse.json();
                    const projects = employeeData?.projects ?? {};

                    const filteredRepos = gitRepos.filter(
                        (repo) =>
                            repo.name.toLowerCase() !== 'michail19' &&
                            repo.name.toLowerCase() !== 'readme'
                    );

                    const merged = filteredRepos.map((repo) => {
                        const matchedEmployees = projects[repo.name] || [];
                        return {
                            ...repo,
                            employees: matchedEmployees,
                        };
                    });

                    setRepos(merged);
                } catch (fallbackErr) {
                    setError(
                        fallbackErr instanceof Error
                            ? fallbackErr.message
                            : 'Unknown error during fallback'
                    );
                }
            } finally {
                setLoading(false);
                setLoad(false)
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const handleLanguageChange = (event: Event) => {
            const newLang = (event as CustomEvent<string>).detail as Language; // Приведение типа
            if (newLang) {
                setLanguage(newLang);
                setUpdateKey((prev) => prev + 1);
            }
        };

        window.addEventListener("languageUpdateEvent", handleLanguageChange);
        return () => window.removeEventListener("languageUpdateEvent", handleLanguageChange);
    }, []);

    // Рассчитываем количество строк, которые умещаются в контейнер
    useEffect(() => {
        if (loading || repos.length === 0) return; // Не рассчитываем при загрузке или пустых данных

        const getCardsPerRow = () => {
            if (!containerRef.current) return 1;

            const containerWidth = containerRef.current.clientWidth;
            const card = containerRef.current.querySelector(".repo-card");

            if (!card) return 1;

            const cardWidth = card.clientWidth;
            const gap = 16; // например, если gap: 1rem

            return Math.max(1, Math.floor(containerWidth / (cardWidth + gap)));
        };

        const calculateRowsPerPage = () => {
            if (!containerRef.current) return;

            const rowElements = containerRef.current.querySelectorAll(".repo-card");
            let maxHeight = 0;

            rowElements.forEach(row => {
                const height = (row as HTMLElement).offsetHeight;
                if (height > maxHeight) {
                    maxHeight = height;
                }
            });

            const finalRowHeight = maxHeight || 70;
            // const finalRowHeight = containerRef.current.clientHeight;

            const viewportHeight = window.innerHeight;
            const headerHeight = document.querySelector(".header")?.clientHeight || 0;
            const dateSwitcherHeight = document.querySelector(".subtitle")?.clientHeight || 0;
            const paginationHeight = document.querySelector(".footer")?.clientHeight || 0;
            const otherElementsHeight = 100;

            const availableHeight1 = viewportHeight - headerHeight - dateSwitcherHeight - paginationHeight - otherElementsHeight;
            const availableHeight2 = containerRef.current.clientHeight;
            let rows1, rows2;
            if (availableHeight1 > 0) {
                rows1 = Math.floor(availableHeight1 / finalRowHeight) || 1;
            }
            else {
                rows1 = 0;
            }

            let rows;
            if (isMobile) {
                rows = rows1;
            }
            else {
                if (availableHeight2 > 0) {
                    rows2 = Math.floor(availableHeight2 / finalRowHeight) || 1;
                }
                else {
                    rows2 = 0;
                }

                if (rows1 > 0 && rows2 <= 0) rows = rows1;
                else if (rows1 <= 0 && rows2 > 0) rows = rows2;
                else if (rows1 > 0 && rows2 > 0) {
                    const dif = availableHeight1 - availableHeight2;
                    if (dif < 0) {
                        if (dif > finalRowHeight) {
                            rows = rows2;
                        } else {
                            rows = rows1;
                        }
                    } else {
                        if (-dif > finalRowHeight) {
                            rows = rows2;
                        } else {
                            rows = rows1;
                        }
                    }
                    console.log(availableHeight1, availableHeight2, dif, finalRowHeight, rows);
                } else rows = 1;
            }

            const cardsPerRow = getCardsPerRow();

            const totalCards = rows * cardsPerRow;

            setRowsPerPage(totalCards);
            if (currentPage > totalPages) setCurrentPage(1);
        };

        window.addEventListener("resize", calculateRowsPerPage);
        calculateRowsPerPage();
        return () => window.removeEventListener("resize", calculateRowsPerPage);
    }, [loading, repos]);

    // Формируем список для отображения
    const displayedRepos = useMemo(() => {
        const filtered = searchQuery
            ? repos.filter((repo) =>
                repo.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : repos;

        return filtered.slice(
            (currentPage - 1) * rowsPerPage,
            currentPage * rowsPerPage
        );
    }, [repos, searchQuery, currentPage, rowsPerPage]);

    // Закрытие попапа при клике вне
    const popupRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target as Node) &&
                !e.composedPath().some((el) =>
                    (el as HTMLElement).classList?.contains('sidebar__btn') ||
                    (el as HTMLElement).classList?.contains('header__up-blocks__headbar__btn')
                )
            ) {
                setIsProjectSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Фокус на input
    useEffect(() => {
        if (isProjectSearchOpen) {
            inputRef.current?.focus();
        }
    }, [isProjectSearchOpen]);

    // Сброс страницы при поиске
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filteredProjects = repos.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProjects.length / rowsPerPage); // Рассчитываем общее количество страниц

    const changePage = (direction: "next" | "previous") => {
        setCurrentPage((prev) => {
            if (direction === "next" && prev < totalPages) return prev + 1;
            if (direction === "previous" && prev > 1) return prev - 1;
            return prev;
        });
    };

    //Перерасчёт страниц
    useEffect(() => {
        if (repos.length === 0 || rowsPerPage === 0) return;

        const maxPage = Math.ceil(repos.length / rowsPerPage);
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [repos.length, rowsPerPage, currentPage]);

    // Загрузка всех сотрудников
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const token = localStorage.getItem('authToken'); // 🔐 Получаем токен

                const response = await fetch("https://ssw-backend.onrender.com/schedule/weekly", {
                    headers: {
                        "Authorization": `Bearer ${token}`, // 🔐 токен добавляется
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Соберем уникальных сотрудников из всех проектов
                const employeesMap = new Map<number, { id: number; fio: string }>();

                data.employees.forEach((emp: any) => {
                    employeesMap.set(emp.id, {id: emp.id, fio: emp.fio});
                });

                const formattedEmployees = Array.from(employeesMap.values());
                setAllEmployees(formattedEmployees);
            } catch (err) {
                console.warn("Не удалось загрузить данные с сервера, пробуем резервный источник…", err);

                const employeesJsonPath =
                    process.env.NODE_ENV === "production"
                        ? "https://raw.githubusercontent.com/Michail19/SimpleSheduleWork/refs/heads/react-dev/public/data/data_fios.json"
                        : "/data/data_fios.json";

                try {
                    const fallbackResponse = await fetch(employeesJsonPath);
                    if (!fallbackResponse.ok) {
                        throw new Error(`Fallback JSON HTTP error! status: ${fallbackResponse.status}`);
                    }

                    const fallbackData = await fallbackResponse.json();
                    const formattedEmployees = fallbackData.employees.map((emp: any) => ({
                        id: Number(emp.id),
                        fio: emp.fio
                    }));
                    setAllEmployees(formattedEmployees);
                } catch (fallbackError) {
                    console.error("Ошибка при загрузке данных из резервного JSON:", fallbackError);
                    setError("Не удалось загрузить список сотрудников ни с сервера, ни из резервного источника");
                }
            }
        };

        fetchEmployees();
    }, []);

    const handleSaveEmployees = (updatedEmployees: Employee[]) => {
        if (!currentProjectForEdit) return;

        // Обновляем repos (основное состояние)
        setRepos(prevRepos =>
            prevRepos.map(repo =>
                repo.id === currentProjectForEdit.id
                    ? {...repo, employees: updatedEmployees}
                    : repo
            )
        );

        // Обновляем activeProject, если он сейчас открыт
        if (activeProject && activeProject.id === currentProjectForEdit.id) {
            setActiveProject({...activeProject, employees: updatedEmployees});
        }

        setIsEmployeePopupOpen(false);
    };

    // Открытие попапа
    const openEmployeePopup = (project: MergedProject | null) => {
        setCurrentProjectForEdit(project);
        setIsEmployeePopupOpen(true);
    };

    const [isHeader, setIsHeader] = useState(false);
    const mobileBreakpoint = 1490;

    useEffect(() => {
        const checkWidth = () => {
            setIsHeader(window.innerWidth <= mobileBreakpoint);
        };

        checkWidth(); // установить при монтировании
        window.addEventListener('resize', checkWidth);

        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    const sidebar = document.querySelector('.sidebar');
    const headbar = document.querySelector('.header__up-blocks__headbar');

    const container = window.innerWidth < 1490 ? headbar : sidebar; // например, выбор контейнера по ширине
    const buttonClassName = window.innerWidth < 1490
        ? 'header__up-blocks__headbar__btn'
        : 'sidebar__btn';
    if (!container) return null;

    const [btnSize, setBtnSize] = useState({width: 0, height: 0});
    const btnRef = useRef<HTMLButtonElement | null>(null);

    // Получаем размер кнопки при монтировании
    useEffect(() => {
        if (btnRef.current) {
            const {width, height} = btnRef.current.getBoundingClientRect();
            setBtnSize({width, height});
        }
    }, [isProjectSearchOpen === false]); // пересчитываем, когда кнопка показывается

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userIcon");
        window.location.href = 'index.html';
    };

    useEffect(() => {
        if (!isMobile) touch_on_load();
    }, [load]);


    return (
        <div className="content" key={updateKey}>
            {ReactDOM.createPortal(
                isProjectSearchOpen ? (
                    <SearchProjectPopup
                        width={btnSize.width}
                        height={btnSize.height}
                        currentTranslation={currentTranslation}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        setIsOpen={setIsProjectSearchOpen}
                        popupRef={popupRef}
                    />
                ) : (
                    <button
                        ref={btnRef}
                        className={buttonClassName}
                        onClick={() => setIsProjectSearchOpen(true)}
                    >
                        {currentTranslation.searchProject}
                    </button>
                ),
                container
            )}

            {isMobile ? (
                <>
                    {
                        document.querySelector('.header__up-blocks__wrapper__list') &&
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
                    {
                        document.querySelector(".header__up-blocks__wrapper__list") &&
                        ReactDOM.createPortal(
                            <>
                                <a className="header__up-blocks__wrapper__list__btn" href="./index.html"
                                   data-key="home">{currentTranslation.home}</a>
                                <a className="header__up-blocks__wrapper__list__btn" href="./main.html"
                                   data-key="schedule">{currentTranslation.schedule}</a>
                            </>,
                            document.querySelector(".header__up-blocks__wrapper__list") as Element
                        )
                    }

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

            {(document.querySelector(".header__up-blocks__wrapper_icon-place") &&
                ReactDOM.createPortal(
                    (localStorage.getItem('userIcon') ? (
                        <img
                            src={localStorage.getItem('userIcon')!}
                            className='header__up-blocks__wrapper__icon_gen'
                            alt="User Icon"/>
                    ) : (
                        <div className="header__up-blocks__wrapper__icon"></div>
                    )),
                    document.querySelector(".header__up-blocks__wrapper_icon-place") as Element
                )
            )}

            {load ? (
                <BlockLoader/> // твой прелоадер
            ) : (
                <>
                    <div className="worksheet">
                        {loading && <div className="loader">{currentTranslation.load}</div>}

                        {error && <div className="error-message">{currentTranslation.error}: {error}</div>}

                        <div ref={containerRef} className="repos__grid">
                            {displayedRepos.map((repo) => (
                                <div
                                    key={repo.id}
                                    className="repo-card"
                                    onClick={() => setActiveProject(repo)}
                                    style={{cursor: 'pointer'}}
                                >
                                    <a
                                        href={repo.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="repo-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="repo-name">{repo.name}</h3>
                                    </a>
                                    {repo.description && <p>{repo.description}</p>}
                                    <div className="repo-meta">
                                        {repo.language && <span className="repo-text">{repo.language}</span>}
                                        <span className="repo-text">⭐ {repo.stargazers_count}</span>
                                        <span
                                            className="repo-text">{currentTranslation.update}: {new Date(repo.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {activeProject && (
                            <ProjectDetailsPopup
                                project={activeProject}
                                onClose={() => setActiveProject(null)}
                                onEditEmployees={() => openEmployeePopup(activeProject)}
                                currentTranslation={currentTranslation}
                            />
                        )}

                        {accessLevel === "OWNER" &&
                            window.innerHeight > 500 &&
                            window.innerWidth > 786 &&
                            isEmployeePopupOpen &&
                            currentProjectForEdit && (
                                <EmployeeManagementPopup
                                    project={currentProjectForEdit}
                                    allEmployees={allEmployees}
                                    onClose={handleSaveEmployees}
                                    currentTranslation={currentTranslation}
                                />
                            )}
                    </div>
                </>
            )}
            {document.querySelector(".footer") &&
                ReactDOM.createPortal(
                    <>
                        <button
                            className="footer__btn"
                            onClick={() => changePage("previous")}
                            disabled={currentPage === 1}
                        >
                            ◄
                        </button>
                        <div className="footer__place">
                            {currentTranslation.page} {currentPage} {currentTranslation.outOf} {totalPages}
                        </div>
                        <button
                            className="footer__btn"
                            onClick={() => changePage("next")}
                            disabled={currentPage === totalPages}
                        >
                            ►
                        </button>
                    </>,
                    document.querySelector(".footer") as Element
                )}
        </div>
    );
};

export default GitHubProjects;
