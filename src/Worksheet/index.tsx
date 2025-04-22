import React, { useEffect, useState, useRef } from "react";
import ReactDOM from 'react-dom';
import { Employee, FiltersState, Language } from './types';
import { translations } from './translations';
import { parseWeekRange, formatWeekRange, translateMonth } from "./timeParsers"
import { calculateWorkHours, filterEmployees } from './utils';
import { FiltersPanel } from './components/FiltersPanel';
import { AddEmployeePopup } from './components/AddEmployeePopup';
import { DeleteEmployeePopup } from './components/DeleteEmployeePopup';
import {MobileEmployeeSearch} from "./components/MobileEmployeeSearch";

const Worksheet: React.FC = () => {
    // Состояния и рефы
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentWeek, setCurrentWeek] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [editingCell, setEditingCell] = useState<{ row: number; day: string; dayIndex: number } | null>(null);
    const [editedTime, setEditedTime] = useState<Record<string, string>>({});
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1090);
    const [language, setLanguage] = useState<Language>("ru");
    const [updateKey, setUpdateKey] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQueryEmployees, setSearchQueryEmployees] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const currentTranslation = translations[language] ?? translations["ru"];
    const [isAddEmployeePopupOpen, setIsAddEmployeePopupOpen] = useState(false);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [filters, setFilters] = useState<FiltersState>({
        projects: [],
        activeProjects: [],
    });
    const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'> & { id?: string }>({
        fio: '',
        projects: '',
        weekSchedule: {
            monday: { start: '', end: '' },
            tuesday: { start: '', end: '' },
            wednesday: { start: '', end: '' },
            thursday: { start: '', end: '' },
            friday: { start: '', end: '' },
            saturday: { start: '', end: '' },
            sunday: { start: '', end: '' },
        }
    });

    // Эффекты и обработчики
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
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
                setUpdateKey((prev) => prev + 1);
            }
        };

        window.addEventListener("languageUpdateEvent", handleLanguageChange);
        return () => window.removeEventListener("languageUpdateEvent", handleLanguageChange);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("authToken"); // предполагается, что ты сохраняешь токен после логина

            try {
                // console.log(token);
                const response = await fetch("https://ssw-backend.onrender.com/schedule/weekly", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Ошибка при загрузке с сервера");
                }

                const data = await response.json();

                const allProjects = data.employees.flatMap((employee: { projects: string }) =>
                    employee.projects?.split(" ") || []
                ).filter(Boolean);

                const uniqueProjects = [...new Set(allProjects)];

                // @ts-ignore
                setFilters(prev => ({
                    ...prev,
                    projects: uniqueProjects
                }));

                setEmployees(data.employees);
                const translatedWeek = translateMonth(data.currentWeek, currentTranslation);
                setCurrentWeek(translatedWeek);
            } catch (error) {
                console.warn("Сервер недоступен, используем JSON-файл", error);

                const jsonPath = process.env.NODE_ENV === "production"
                    ? "https://raw.githubusercontent.com/Michail19/SimpleSheduleWork/refs/heads/master/public/data/data_example.json"
                    : "/data/data_example.json";

                try {
                    const fallbackResponse = await fetch(jsonPath);
                    const data = await fallbackResponse.json();

                    const allProjects = data.employees.flatMap((employee: { projects: string }) =>
                        employee.projects?.split(" ") || []
                    ).filter(Boolean);

                    const uniqueProjects = [...new Set(allProjects)];

                    // @ts-ignore
                    setFilters(prev => ({
                        ...prev,
                        projects: uniqueProjects
                    }));

                    setEmployees(data.employees);
                    const translatedWeek = translateMonth(data.currentWeek, currentTranslation);
                    setCurrentWeek(translatedWeek);
                } catch (fallbackErr) {
                    console.error("Ошибка при загрузке fallback JSON:", fallbackErr);
                }
            }
        };

        fetchData();
    }, [language]);


    // Рассчитываем количество строк, которые умещаются в контейнер
    useEffect(() => {
        const calculateRowsPerPage = () => {
            if (!containerRef.current) return;

            const rowElements = containerRef.current.querySelectorAll(".worksheet__row");
            let maxHeight = 0;

            rowElements.forEach(row => {
                const height = (row as HTMLElement).offsetHeight;
                if (height > maxHeight) {
                    maxHeight = height;
                }
            });

            // Если нет строк, fallback
            const finalRowHeight = maxHeight || 40;

            // const containerTop = containerRef.current.getBoundingClientRect().top;
            const viewportHeight = window.innerHeight; // Высота всего окна браузера
            const headerHeight = document.querySelector(".header")?.clientHeight || 0; // Высота заголовка
            const dateSwitcherHeight = document.querySelector(".subtitle")?.clientHeight || 0;
            const paginationHeight = document.querySelector(".footer")?.clientHeight || 0;
            const otherElementsHeight = 48; // Если есть отступы, доп. элементы
            const availableHeight = viewportHeight - headerHeight - dateSwitcherHeight - paginationHeight - otherElementsHeight;

            const newRowsPerPage = Math.floor(availableHeight / finalRowHeight) || 1;

            setRowsPerPage(newRowsPerPage - 1);
        };

        window.addEventListener("resize", calculateRowsPerPage);
        calculateRowsPerPage();
        return () => window.removeEventListener("resize", calculateRowsPerPage);
    }, [employees]); // или employees, если до фильтрации


    const changeWeek = async (direction: "next" | "previous") => {
        const parsedWeek = parseWeekRange(currentWeek, currentTranslation);
        if (!parsedWeek) return;

        const { start, end } = parsedWeek;
        const newStart = new Date(start);
        const newEnd = new Date(end);

        if (direction === "next") {
            newStart.setDate(newStart.getDate() + 7);
            newEnd.setDate(newEnd.getDate() + 7);
        } else {
            newStart.setDate(newStart.getDate() - 7);
            newEnd.setDate(newEnd.getDate() - 7);
        }

        // Форматируем дату вручную для гарантии правильного формата
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() - 3).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formattedDate = formatDate(newStart);
        const newWeekRange = formatWeekRange(newStart, newEnd, currentTranslation);

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                throw new Error("Токен авторизации не найден");
            }

            const url = `https://ssw-backend.onrender.com/schedule/weekly?date=${formattedDate}`;
            console.log("Отправка запроса на:", url); // Логируем URL для отладки

            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Cache-Control": "no-cache" // Отключаем кеширование
                },
            });

            console.log("Статус ответа:", response.status); // Логируем статус ответа

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Полученные данные:", data); // Логируем полученные данные

            if (!data?.employees) {
                throw new Error("Получены пустые данные от сервера");
            }

            const allProjects: string[] = data.employees.flatMap(
                (employee: { projects: string }) => employee.projects?.split(" ") || []
            ).filter(Boolean);

            const uniqueProjects: string[] = [...new Set(allProjects)];

            setFilters(prev => ({
                ...prev,
                projects: uniqueProjects,
                activeProjects: prev.activeProjects
            }));

            setEmployees(data.employees);
            setCurrentWeek(newWeekRange);

        } catch (error) {
            console.error("Ошибка при загрузке данных:", error);
            // Можно добавить уведомление пользователю об ошибке
            setCurrentWeek(newWeekRange);
        }
    };

    const toggleProjectFilter = (project: string) => {
        setFilters(prev => {
            const newActiveProjects = prev.activeProjects.includes(project)
                ? prev.activeProjects.filter(p => p !== project)
                : [...prev.activeProjects, project];

            return {
                ...prev,
                activeProjects: newActiveProjects
            };
        });
    };

    const clearFilters = () => {
        setFilters(prev => ({
            ...prev,
            activeProjects: []
        }));
    };

    useEffect(() => {
        if (showFilters && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showFilters]);

    const filteredEmployees = filterEmployees(employees, filters, searchQueryEmployees);
    const currentEmployee = filteredEmployees.length > 0 ? filteredEmployees[0] : null; // Фиксируем current сотрудника (первого в списке)
    const paginatedEmployees = filteredEmployees.slice(1); // Остальные сотрудники (без current) для пагинации
    const totalPages = Math.ceil(paginatedEmployees.length / rowsPerPage); // Рассчитываем общее количество страниц

    // Формируем список для отображения
    const displayedEmployees = [
        ...(currentEmployee ? [currentEmployee] : []), // Всегда добавляем current первым
        ...paginatedEmployees.slice(
            (currentPage - 1) * rowsPerPage,
            currentPage * rowsPerPage
        )
    ];

    useEffect(() => {
        // Сбрасываем на первую страницу при изменении фильтров
        setCurrentPage(1);
    }, [filters.activeProjects]);

    const changePage = (direction: "next" | "previous") => {
        setCurrentPage((prev) => {
            if (direction === "next" && prev < totalPages) return prev + 1;
            if (direction === "previous" && prev > 1) return prev - 1;
            return prev;
        });
    };

    const handleEdit = (row: number, dayIndex: number, day: string, type: string, value: string) => {
        setEditedTime((prev) => ({
            ...prev,
            [`${row}-${dayIndex}-${type}`]: value,
        }));
    };

    const handleBlur = (employeeIndex: number, dayIndex: number, day: string, type: "start" | "end", event?: React.FocusEvent<HTMLInputElement> | null) => {
        const relatedTarget = event?.relatedTarget as HTMLInputElement | null;

        if (relatedTarget && relatedTarget.tagName === "INPUT") {
            return; // Не сбрасываем состояние, если переходим на другой input
        }

        const editedStart = editedTime[`${employeeIndex}-${dayIndex}-start`] || "";
        const editedEnd = editedTime[`${employeeIndex}-${dayIndex}-end`] || "";

        const oldValue = employees[employeeIndex].weekSchedule[day] || { start: "", end: "" };
        const hadOldValues = oldValue.start !== "" || oldValue.end !== ""; // Было ли что-то в старых данных
        const hasNewValues = editedStart !== "" || editedEnd !== ""; // Есть ли новые данные

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

        const isStartValid = editedStart === "" || timeRegex.test(editedStart);
        const isEndValid = editedEnd === "" || timeRegex.test(editedEnd);

        // Если оба поля пустые и раньше не было значений — не сохраняем
        if (!hadOldValues && !hasNewValues) {
            return;
        }

        // Если раньше было значение, но пользователь удалил всё — откатываем к старым данным
        if (hadOldValues && !hasNewValues) {
            setEmployees((prev) =>
                prev.map((employee, index) =>
                    index === employeeIndex
                        ? {
                            ...employee,
                            weekSchedule: {
                                ...employee.weekSchedule,
                                [day]: oldValue, // Восстанавливаем предыдущие данные
                            },
                        }
                        : employee
                )
            );
            setEditingCell(null);
            return;
        }

        // Если хотя бы одно поле некорректное — откатываем
        if (!isStartValid || !isEndValid) {
            setEmployees((prev) =>
                prev.map((employee, index) =>
                    index === employeeIndex
                        ? {
                            ...employee,
                            weekSchedule: {
                                ...employee.weekSchedule,
                                [day]: oldValue,
                            },
                        }
                        : employee
                )
            );
            setEditingCell(null);
            return;
        }

        // Если в старых данных пусто — требуем заполнения обоих полей
        if (!hadOldValues && (editedStart === "" || editedEnd === "")) {
            return;
        }

        // Если оба поля заполнены корректно, обновляем
        setEmployees((prev) =>
            prev.map((employee, index) =>
                index === employeeIndex
                    ? {
                        ...employee,
                        weekSchedule: {
                            ...employee.weekSchedule,
                            [day]: {
                                start: editedStart || oldValue.start,
                                end: editedEnd || oldValue.end,
                            },
                        },
                    }
                    : employee
            )
        );

        setEditingCell(null);
        // TODO: отправить обновленные данные в API
    };

    const handleClearTime = (row: number, dayIndex: number, day: string) => {
        setEmployees((prev) =>
            prev.map((employee, index) =>
                index === row
                    ? {
                        ...employee,
                        weekSchedule: {
                            ...employee.weekSchedule,
                            [day]: { start: "", end: "" }, // Полностью очищаем расписание
                        },
                    }
                    : employee
            )
        );
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && editingCell !== null) {
                setEditingCell(null); // Отключаем редактирование
            }
            if (e.key === "Enter" && editingCell !== null) {
                const inputElement = document.querySelector("input"); // Находим input
                if (inputElement) {
                    const value = inputElement.value; // Получаем значение
                    handleEdit(editingCell.row, editingCell.dayIndex, editingCell.day, "start", value); // Сохраняем значение
                    const nextInput = inputRefs.current[1]; // Следующий input
                    if (nextInput) {
                        nextInput.focus(); // Переключаем фокус на следующий input
                    }
                    setEditingCell(null); // Завершаем редактирование
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [editingCell]); // Добавляем editingCell в зависимости

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.filters-panel') &&
                !target.closest('.sidebar__btn[data-key="sidebar_filters"]') &&
                !target.closest('.header__up-blocks__headbar__btn')) {
                setShowFilters(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddEmployee = (employeeData: Omit<Employee, 'id'> & { id?: string }) => {
        const projectsFromNewEmployee = employeeData.projects?.split(' ').filter(Boolean) || [];

        // Генерируем новый ID
        const newId = employees.length > 0
            ? Math.max(...employees.map(e => parseInt(e.id))) + 1
            : 1;

        // Создаем нового сотрудника с ID на первом месте
        const newEmployee: Employee = {
            id: newId.toString(),
            fio: employeeData.fio,
            projects: employeeData.projects || '',
            weekSchedule: employeeData.weekSchedule
        };

        setEmployees(prev => [...prev, newEmployee]);

        // Обновляем список фильтров
        setFilters(prev => {
            const newProjects = [...prev.projects];
            let hasUpdates = false;

            projectsFromNewEmployee.forEach(project => {
                if (!newProjects.includes(project)) {
                    newProjects.push(project);
                    hasUpdates = true;
                }
            });

            return hasUpdates
                ? { ...prev, projects: newProjects.sort() }
                : prev;
        });

        setIsAddEmployeePopupOpen(false);
        setNewEmployee({
            fio: '',
            projects: '',
            weekSchedule: {
                monday: { start: '', end: '' },
                tuesday: { start: '', end: '' },
                wednesday: { start: '', end: '' },
                thursday: { start: '', end: '' },
                friday: { start: '', end: '' },
                saturday: { start: '', end: '' },
                sunday: { start: '', end: '' },
            }
        });
    };

    const handleDeleteEmployee = (employeeId: string) => {
        setEmployees(prev => {
            const updatedEmployees = prev.filter(emp => emp.id !== employeeId);

            // Обновляем фильтры после удаления
            const remainingProjects = updatedEmployees.flatMap(emp =>
                emp.projects?.split(' ').filter(Boolean) || []
            );

            setFilters(f => ({
                ...f,
                projects: [...new Set(remainingProjects)].sort()
            }));

            return updatedEmployees;
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        window.location.href = '/index.html';
    };


    return (
        <div className="content" key={updateKey}>
            {/* Рендеринг порталов и компонентов */}
            {document.querySelector('.sidebar') &&
                ReactDOM.createPortal(
                    <button
                        className="sidebar__btn"
                        onClick={() => setIsAddEmployeePopupOpen(true)}
                    >
                        {currentTranslation.addAnEmployeeBR}
                    </button>,
                    document.querySelector('.sidebar') as Element
                )
            }
            {document.querySelector('.header__up-blocks__headbar') &&
                ReactDOM.createPortal(
                    <button
                        className="header__up-blocks__headbar__btn"
                        onClick={() => setIsAddEmployeePopupOpen(true)}
                    >
                        {currentTranslation.addAnEmployee}
                    </button>,
                    document.querySelector('.header__up-blocks__headbar') as Element
                )
            }
            {isAddEmployeePopupOpen && (
                <AddEmployeePopup
                    onClose={() => setIsAddEmployeePopupOpen(false)}
                    onSave={handleAddEmployee}
                    currentTranslation={currentTranslation}
                    filters={filters}
                    initialData={newEmployee}
                />
            )}

            {document.querySelector('.sidebar') &&
                ReactDOM.createPortal(
                    <button
                        className="sidebar__btn"
                        onClick={() => setIsDeletePopupOpen(true)}
                    >
                        {currentTranslation.deleteAnEmployeeBR}
                    </button>,
                    document.querySelector('.sidebar') as Element
                )
            }
            {document.querySelector('.header__up-blocks__headbar') &&
                ReactDOM.createPortal(
                    <button
                        className="header__up-blocks__headbar__btn"
                        onClick={() => setIsDeletePopupOpen(true)}
                    >
                        {currentTranslation.deleteAnEmployee}
                    </button>,
                    document.querySelector('.header__up-blocks__headbar') as Element
                )
            }
            {isDeletePopupOpen && (
                <DeleteEmployeePopup
                    employees={employees}
                    onDelete={handleDeleteEmployee}
                    onClose={() => {
                        setIsDeletePopupOpen(false);
                        setSearchTerm('');
                        setSelectedEmployee(null);
                    }}
                    currentTranslation={currentTranslation}
                />
            )}

            {document.querySelector('.sidebar') &&
                ReactDOM.createPortal(
                    <button
                        className={`sidebar__btn ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        data-key="sidebar_filters"
                    >
                        {currentTranslation.filters}
                    </button>,
                    document.querySelector('.sidebar') as Element
                )
            }
            {showFilters && (
                ReactDOM.createPortal(
                    <FiltersPanel
                        filters={filters}
                        searchQuery={searchQueryEmployees}
                        currentTranslation={currentTranslation}
                        setSearchQuery={setSearchQueryEmployees}
                        toggleProjectFilter={toggleProjectFilter}
                        clearFilters={clearFilters}
                        setShowFilters={setShowFilters}
                    />,
                    document.querySelector('.sidebar') as Element
                )
            )}

            {document.querySelector('.header__up-blocks__headbar') &&
                ReactDOM.createPortal(
                    <button
                        className={`header__up-blocks__headbar__btn ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        data-key="sidebar_filters"
                    >
                        {currentTranslation.filters}
                    </button>,
                    document.querySelector('.header__up-blocks__headbar') as Element
                )
            }
            {showFilters && (
                ReactDOM.createPortal(
                    <FiltersPanel
                        filters={filters}
                        searchQuery={searchQueryEmployees}
                        currentTranslation={currentTranslation}
                        setSearchQuery={setSearchQueryEmployees}
                        toggleProjectFilter={toggleProjectFilter}
                        clearFilters={clearFilters}
                        setShowFilters={setShowFilters}
                    />,
                    document.querySelector('.header__up-blocks__headbar') as Element
                )
            )}

            {document.querySelector(".subtitle__date__place") &&
                ReactDOM.createPortal(
                    <button
                        className="subtitle__date__btn"
                        onClick={() => changeWeek('previous')}
                    >
                        ◄
                    </button>,
                    document.querySelector(".subtitle__date__place") as Element
                )}

            {document.querySelector(".subtitle__date__place") &&
                ReactDOM.createPortal(
                    <span className="subtitle__date__place_text">{currentWeek}</span>,
                    document.querySelector(".subtitle__date__place") as Element
                )}

            {document.querySelector(".subtitle__date") &&
                ReactDOM.createPortal(
                    <button
                        className="subtitle__date__btn"
                        onClick={() => changeWeek('next')}
                    >
                        ►
                    </button>,
                    document.querySelector(".subtitle__date") as Element
                )}

            {document.querySelector('.header__up-blocks__wrapper__list') &&
                (localStorage.getItem("authToken") != null) &&
                ReactDOM.createPortal(
                    <button
                        className="header__up-blocks__wrapper__list__btn"
                        onClick={() => handleLogout()}
                    >
                        Выход
                    </button>,
                    document.querySelector('.header__up-blocks__wrapper__list') as Element
                )
            }

            {/* Остальной JSX */}
            {isMobile ? (
                <>
                    <MobileEmployeeSearch
                        employees={displayedEmployees}
                        translations={currentTranslation}
                        editingCell={editingCell}
                        editedTime={editedTime}
                        onEdit={handleEdit}
                        onBlur={handleBlur}
                        onSetEditingCell={setEditingCell}
                    />
                </>
            ) : (
                <>
                    <div ref={containerRef} className="worksheet">
                        {filteredEmployees.length > 0 ? (
                            <>
                                <div className="worksheet__row__header">
                                    <div className="worksheet__row__header__cell header-cell">{currentTranslation.title}</div>
                                    <div className="worksheet__row__header__cell_clock">
                                        <div className="cell_clock_img"></div>
                                    </div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.monday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.tuesday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.wednesday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.thursday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.friday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.saturday}</div>
                                    <div className="worksheet__row__header__cell">{currentTranslation.sunday}</div>
                                </div>
                                {displayedEmployees.map((employee, index) => (
                                    <div
                                        key={index}
                                        className={`worksheet__row ${employee === employees[0] ? "current" : ""}`}
                                        // style={{ height: `${maxRowHeight}px` }}
                                    >
                                        <div className="worksheet__cell_name">{employee.fio}</div>
                                        <div className="worksheet__cell_clock">{calculateWorkHours(employee.weekSchedule)}{currentTranslation.hour}</div>
                                        {Object.keys(employee.weekSchedule).map((day: string, dayIndex: number) => {
                                            const schedule = employee.weekSchedule[day];
                                            console.log(schedule);
                                            return (
                                                <div key={dayIndex} className="worksheet__cell">
                                                    {editingCell?.row === index && editingCell?.day === day ? (
                                                        <>
                                                            <input
                                                                type="time"
                                                                value={editedTime[`${index}-${dayIndex}-start`] || schedule.start}
                                                                onChange={(e) => handleEdit(index, dayIndex, day, "start", e.target.value)}
                                                                onBlur={(e) => handleBlur(index, dayIndex, day, "start", e)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        setEditingCell(null); // Отмена редактирования
                                                                    }
                                                                    if (e.key === "Enter") {
                                                                        handleBlur(index, dayIndex, day, "start", null);
                                                                    }
                                                                }}
                                                            />
                                                            -
                                                            <input
                                                                type="time"
                                                                value={editedTime[`${index}-${dayIndex}-end`] || schedule.end}
                                                                onChange={(e) => handleEdit(index, dayIndex, day, "end", e.target.value)}
                                                                onBlur={(e) => handleBlur(index, dayIndex, day, "end", e)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        setEditingCell(null); // Отмена редактирования
                                                                    }
                                                                    if (e.key === "Enter") {
                                                                        handleBlur(index, dayIndex, day, "end", null);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                className="clear-time-btn"
                                                                onClick={() => handleClearTime(index, dayIndex, day)}
                                                                title="Очистить время"
                                                                style={{
                                                                    marginLeft: "0.5em",
                                                                    cursor: "pointer",
                                                                    background: "none",
                                                                    border: "none",
                                                                    fontSize: "1em",
                                                                    color: "#888"
                                                                }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ row: index, day: day, dayIndex: dayIndex })}>
                                                            {`${schedule?.start} - ${schedule?.end}`}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="no-results">
                                {currentTranslation.noResults}
                            </div>
                        )}
                    </div>
                    {document.querySelector(".footer") &&
                        (totalPages > 1) &&
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
                </>
            )}
        </div>
    );
};

export default Worksheet;
