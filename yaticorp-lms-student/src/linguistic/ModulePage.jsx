/**
 * A module's old address (/linguistic/grammar): the learning path, opened at
 * that module's unit.
 */
import { Navigate, useParams } from 'react-router-dom';
import { MODULES } from './meta';

export default function ModulePage() {
    const { module } = useParams();
    return <Navigate to={MODULES[module] ? `/linguistic?unit=${module}` : '/linguistic'} replace />;
}
