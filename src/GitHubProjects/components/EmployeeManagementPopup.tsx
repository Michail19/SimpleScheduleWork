import React, {useState, useEffect, useRef} from 'react';
import {translations} from "../translations";
import {Language} from "../types";
import {verifyToken} from "../../UserAccessLevel";
import BlockLoader from "../../BlockLoader";

interface Employee {
    id: number;
    fio: string;
}

interface Project {
    id: number;
    name: string;
    employees: Employee[];
}

interface EmployeeManagementPopupProps {
    project: Project;
    allEmployees: Employee[];
    onClose: (updatedEmployees: Employee[]) => void;
    currentTranslation: typeof translations[Language];
}

const EmployeeManagementPopup: React.FC<EmployeeManagementPopupProps> = ({
                                                                             project,
                                                                             allEmployees,
                                                                             onClose,
                                                                             currentTranslation,
                                                                         }) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentAttached, setCurrentAttached] = useState<Employee[]>(project.employees);
    const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Фильтрация сотрудников
    const filterEmployees = (employees: Employee[], query: string) => {
        if (!query) return employees;
        return employees.filter(emp =>
            emp.fio.toLowerCase().includes(query.toLowerCase())
        );
    };

    useEffect(() => {
        const filtered = allEmployees.filter(emp =>
            !currentAttached.some(attached => attached.id === emp.id)
        );
        setAvailableEmployees(filtered);
    }, [currentAttached, allEmployees]);

    const handleAttach = (employee: Employee) => {
        setCurrentAttached(prev => [...prev, employee]);
        // setSearchQuery('');
        // searchInputRef.current?.focus();
    };

    const handleDetach = (employeeId: number) => {
        setCurrentAttached(prev => prev.filter(emp => emp.id !== employeeId));
    };

    useEffect(() => {
        setCurrentAttached(project.employees);
    }, [project.employees]);

    const handleSave = async () => {
        // Вычисляем, кто добавлен и кто удалён
        const originalIds = new Set(project.employees.map(e => e.id));
        const currentIds = new Set(currentAttached.map(e => e.id));

        const added = currentAttached.filter(e => !originalIds.has(e.id));
        const removed = project.employees.filter(e => !currentIds.has(e.id));

        // Формируем payload в точном формате, как в curl-примере
        const payload = [];

        if (added.length > 0) {
            payload.push({
                action: 'add',
                fio: added.map(emp => ({id: emp.id, fio: emp.fio})), // Важно: передаем массив {id, fio}
                project: project.name,
            });
        }

        if (removed.length > 0) {
            payload.push({
                action: 'remove',
                fio: removed.map(emp => ({id: emp.id, fio: emp.fio})), // Аналогично для удаления
                project: project.name,
            });
        }

        if (payload.length === 0) {
            onClose(currentAttached);
            return;
        }

        // Проверяем токен
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert(currentTranslation.alertAuth);
            return;
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

        // Логируем payload для отладки
        console.log("Отправляемые данные:", JSON.stringify(payload, null, 2));

        try {
            setLoading(true);

            const response = await fetch('http://127.0.0.1:8000/projects/change/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json(); // Попробуем прочитать тело ошибки
                console.error("Детали ошибки:", errorData);
                throw new Error(`${currentTranslation.error}: ${response.status} - ${errorData.message || currentTranslation.unknownError}`);
            }

            // Всё успешно — закрываем попап
            onClose(currentAttached);
        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            alert(currentTranslation.alertChange);
        } finally {
            setLoading(false); // Скрываем прелоадер в любом случае
        }
    };


    return (
        <div className="popup-overlay">
            <div className="employee-management-popup">
                <h2 className="popup-header">{currentTranslation.controlEmployee}: {project.name}</h2>

                {loading ? (
                    <BlockLoader/> // твой прелоадер
                ) : (
                    <>
                        <div className="search-section">
                            <input
                                type="text"
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={currentTranslation.searchEmployeePlaceholder}
                            />
                        </div>

                        <div className="employees-lists">
                            <div className="attached-section">
                                <h3 className="section-header-h">{currentTranslation.addedEmployee}</h3>
                                {filterEmployees(currentAttached, searchQuery).length === 0 ? (
                                    <p className="empty-message">
                                        {searchQuery ? currentTranslation.nothingFounded : currentTranslation.noAddedEmployee}
                                    </p>
                                ) : (
                                    <ul className="employees-list">
                                        {filterEmployees(currentAttached, searchQuery).map(emp => (
                                            <li className="employees-element" key={`attached-${emp.id}`}>
                                                <span className="employees-element-name">{emp.fio}</span>
                                                <button
                                                    onClick={() => handleDetach(emp.id)}
                                                    className="action-btn detach-btn"
                                                >
                                                    −
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="available-section">
                                <h3 className="section-header-h">{currentTranslation.availableEmployee}</h3>
                                {filterEmployees(availableEmployees, searchQuery).length === 0 ? (
                                    <p className="empty-message">
                                        {searchQuery ? currentTranslation.nothingFounded : currentTranslation.noAvailableEmployee}
                                    </p>
                                ) : (
                                    <ul className="employees-list">
                                        {filterEmployees(availableEmployees, searchQuery).map(emp => (
                                            <li className="employees-element" key={`available-${emp.id}`}>
                                                <span className="employees-element-name">{emp.fio}</span>
                                                <button
                                                    onClick={() => handleAttach(emp)}
                                                    className="action-btn attach-btn"
                                                >
                                                    +
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="popup-actions">
                    <button onClick={() => onClose(project.employees)} className="cancel-btn popup-actions-btn">
                        {currentTranslation.close}
                    </button>
                    <button onClick={handleSave} className="save-btn popup-actions-btn">
                        {currentTranslation.saveChanges}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeManagementPopup;
