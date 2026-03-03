import React, {useState} from 'react';
import {Employee, Language} from '../types';
import {translations} from "../translations";
import {verifyToken} from "../../UserAccessLevel";
import BlockLoader from "../../BlockLoader";

interface DeleteEmployeePopupProps {
    employees: Employee[];
    onDelete: (id: string) => void;
    onClose: () => void;
    currentTranslation: typeof translations[Language];
}

export const DeleteEmployeePopup: React.FC<DeleteEmployeePopupProps> = ({
                                                                            employees,
                                                                            onDelete,
                                                                            onClose,
                                                                            currentTranslation
                                                                        }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = React.useState(false);

    const filteredEmployees = employees.filter(employee =>
        employee.fio.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async () => {
        const token = localStorage.getItem("authToken");

        if (!token) {
            console.error("Токен авторизации не найден");
            selectedEmployee && onDelete(selectedEmployee.id);
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

            const response = await fetch(`https://ssw-backend-django.onrender.com/schedule/delete/${selectedEmployee?.id}/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error("Ошибка при удалении сотрудника");
            } else {
                console.log(selectedEmployee && selectedEmployee.id);
                selectedEmployee && onDelete(selectedEmployee.id);
            }

            onClose();
        } catch (error) {
            console.error(error);
            alert("Не удалось удалить сотрудника.");
        } finally {
            setLoading(false); // Скрываем прелоадер в любом случае
        }
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="delete-popup" onClick={e => e.stopPropagation()}>
                <h2>{currentTranslation.deleteEmployee}</h2>
                <button className="close-btn" onClick={onClose}>×</button>

                {loading ? (
                    <BlockLoader/> // твой прелоадер
                ) : (
                    <>
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder={currentTranslation.searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="employees-list">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map(employee => (
                                    <div
                                        key={employee.id}
                                        className={`employee-item ${
                                            selectedEmployee?.id === employee.id ? 'selected' : ''
                                        }`}
                                        onClick={() => setSelectedEmployee(employee)}
                                    >
                                        <span>{employee.fio}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="no-results">{currentTranslation.noResults}</div>
                            )}
                        </div>
                    </>
                )}

                <div className="popup-actions">
                    <button className="popup-actions-btn" onClick={onClose}>{currentTranslation.cancel}</button>
                    <button
                        onClick={() => handleDelete()}
                        disabled={!selectedEmployee}
                        className="popup-actions-btn danger-btn"
                    >
                        {currentTranslation.deleteSelected}
                    </button>
                </div>
            </div>
        </div>
    );
};
