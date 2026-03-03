import React, {useState, useEffect, useRef} from 'react';
import {Employee, FiltersState, Language} from '../types';
import {translations} from '../translations';
import {verifyToken} from "../../UserAccessLevel";
import BlockLoader from "../../BlockLoader";

interface AddEmployeePopupProps {
    onClose: () => void;
    onSave: (employee: Omit<Employee, 'id'> & { id?: string }) => void;
    currentTranslation: typeof translations[Language];
    filters: FiltersState;
    initialData?: Omit<Employee, 'id'> & { id?: string };
}

export const AddEmployeePopup: React.FC<AddEmployeePopupProps> = ({
                                                                      onClose,
                                                                      onSave,
                                                                      currentTranslation,
                                                                      filters,
                                                                      initialData
                                                                  }) => {
    const [employeeData, setEmployeeData] = useState<Omit<Employee, 'id'> & { id?: string } & {
        username: string;
        password: string;
        role: 'USER' | 'OWNER';
    }>({
        fio: '',
        username: '',
        password: '',
        role: 'USER',
        weekSchedule: {
            monday: {start: '', end: ''},
            tuesday: {start: '', end: ''},
            wednesday: {start: '', end: ''},
            thursday: {start: '', end: ''},
            friday: {start: '', end: ''},
            saturday: {start: '', end: ''},
            sunday: {start: '', end: ''},
        }
    });

    const popupRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const {name, value} = e.target;
        setEmployeeData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleScheduleChange = (day: string, type: 'start' | 'end', value: string) => {
        setEmployeeData(prev => ({
            ...prev,
            weekSchedule: {
                ...prev.weekSchedule,
                [day]: {
                    ...prev.weekSchedule[day],
                    [type]: value
                }
            }
        }));
    };

    const handleSave = async (employee: typeof employeeData) => {
        const token = localStorage.getItem("authToken");

        if (!token) {
            console.error("Токен авторизации не найден");
            onSave(employeeData);
            return; // Не делаем редирект, просто выходим
        }

        if (!await verifyToken()) {
            // Показываем alert с сообщением
            alert(currentTranslation.old_session);

            // Через небольшой таймаут (для UX) делаем редирект
            setTimeout(() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("userIcon");
                window.location.href = 'index.html';
            }, 100); // 100мс - пользователь успеет увидеть сообщение

            return; // <<< ДОБАВИТЬ! Прерываем функцию
        }

        try {
            setLoading(true);

            const response = await fetch("https://ssw-backend-django.onrender.com/schedule/add/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    fio: employee.fio,
                    username: employee.username,
                    password: employee.password,
                    role: employee.role,
                    schedule: employee.weekSchedule,
                }),
            });

            if (!response.ok) {
                throw new Error("Ошибка при добавлении сотрудника");
            } else {
                const generatedId = await response.json();
                const newEmployeeData = {
                    ...employeeData,
                    id: String(generatedId), // или оставить просто generatedId, если в твоём массиве id — число
                };
                onSave(newEmployeeData);
                console.log(newEmployeeData.id);
            }

            onClose();
        } catch (error) {
            console.error(error);
            alert(currentTranslation.alertEmployee);
        } finally {
            setLoading(false); // Скрываем прелоадер в любом случае
        }
    };

    // Инициализация начальными данными
    useEffect(() => {
        if (initialData) {
            setEmployeeData(prev => ({
                username: '',
                password: '',
                role: 'USER',
                ...initialData,
            }));
        }
    }, [initialData]);


    return (
        <div className="popup-overlay">
            <div className="add-employee-popup" ref={popupRef}>
                <h2>{currentTranslation.addEmployee}</h2>
                <button className="close-btn" onClick={onClose}>×</button>

                {loading ? (
                    <BlockLoader/> // твой прелоадер
                ) : (
                    <>
                        <div className="search-container">
                            <label>{currentTranslation.fullName}</label>
                            <input
                                type="text"
                                name="fio"
                                placeholder={currentTranslation.enterName}
                                value={employeeData.fio}
                                onChange={handleChange}
                                autoComplete="off" // Отключаем автозаполнение
                            />
                        </div>

                        <div className="search-container">
                            <label>{currentTranslation.username}</label>
                            <input
                                type="text"
                                name="username"
                                placeholder={currentTranslation.enterUsername}
                                value={employeeData.username}
                                onChange={handleChange}
                                autoComplete="new-username" // Блокируем подсказки
                                // Дополнительные атрибуты для надёжности:
                                role="presentation" // Помечаем как "не для автозаполнения"
                                readOnly // Временно блокируем (Chrome иногда игнорирует autocomplete)
                                onFocus={(e) => {
                                    e.target.removeAttribute("readOnly"); // Разблокируем при фокусе
                                }}
                            />
                        </div>

                        <div className="search-container">
                            <label>{currentTranslation.password}</label>
                            <input
                                type="password"
                                name="password"
                                placeholder={currentTranslation.enterPassword}
                                value={employeeData.password}
                                onChange={handleChange}
                                autoComplete="new-password" // Блокируем сохранение пароля
                                data-lpignore="true" // Отключает LastPass и другие менеджеры паролей
                            />
                        </div>

                        <div className="search-container">
                            <label>{currentTranslation.role}</label>
                            <select
                                name="role"
                                value={employeeData.role}
                                onChange={handleChange}
                            >
                                <option value="USER">{currentTranslation.userRole}</option>
                                <option value="OWNER">{currentTranslation.adminRole}</option>
                            </select>
                        </div>

                        <h3>{currentTranslation.workSchedule}</h3>
                        {Object.entries(employeeData.weekSchedule).map(([day, time]) => (
                            <div key={day} className="schedule-row">
                                <label>{currentTranslation[day as keyof typeof currentTranslation]}:</label>
                                <input
                                    type="time"
                                    value={time.start}
                                    onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                                />
                                <span>-</span>
                                <input
                                    type="time"
                                    value={time.end}
                                    onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                                />
                            </div>
                        ))}
                    </>
                )}

                <div className="popup-actions">
                    <button className="popup-actions-btn" onClick={onClose}>{currentTranslation.cancel}</button>
                    <button
                        className="popup-actions-btn save-btn"
                        onClick={() => handleSave(employeeData)}
                        disabled={
                            !employeeData.fio.trim() ||
                            !employeeData.username.trim() ||
                            !employeeData.password.trim()
                        }
                    >
                        {currentTranslation.save}
                    </button>
                </div>
            </div>
        </div>
    );
};
