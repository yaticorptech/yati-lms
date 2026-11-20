/**
 * The department Campus pages work in, and Campus's /context (who is signed in and what
 * they see). Provided by CampusLayout; read with useCampus().
 */
import { createContext, useContext } from 'react';

export const CampusContext = createContext(null);
/** { ctx, role, departments, dept, setDeptId, reload } */
export const useCampus = () => useContext(CampusContext);
/** The pages written for the Campus app ask useAuth() for `reload` (Departments). */
export const useAuth = () => { const c = useContext(CampusContext); return { reload: c?.reload, context: c?.ctx }; };
/** Who chooses the department they work in. */
export const picksDept = (role) => role === 'admin' || role === 'admission';
