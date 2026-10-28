import { createContext, useContext } from 'react';

/** The signed-in teacher, provided by TeacherContext.jsx. */
export const TeacherContext = createContext(null);
export const useTeacher = () => useContext(TeacherContext);

/** Whether this teacher has the research side (an AI card). Older saved sessions without the flag do. */
export const hasResearch = (teacher) => teacher?.research !== false;
