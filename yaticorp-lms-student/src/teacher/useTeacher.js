import { createContext, useContext } from 'react';

/** The signed-in teacher, provided by TeacherContext.jsx. */
export const TeacherContext = createContext(null);
export const useTeacher = () => useContext(TeacherContext);
