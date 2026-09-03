/**
 * The student app's shared UI primitives.
 *
 * These already existed — Career Path was built on a complete set of them while
 * the rest of the student app hand-rolled raw Tailwind on every page. They were
 * never LMS-specific: their tokens live in `@theme` and are unscoped, so they
 * render correctly anywhere. This file is the single import point, so a page
 * asks for `components/ui` rather than reaching across into the career folder.
 */
export { default as Button } from '../../career/components/ui/Button';
export { default as Card, CardHeader } from '../../career/components/ui/Card';
export { default as EmptyState } from '../../career/components/ui/EmptyState';
export { default as PageHeader } from '../../career/components/ui/PageHeader';
export { default as ProgressBar } from '../../career/components/ui/ProgressBar';
export { default as StatCard } from '../../career/components/ui/StatCard';
export { Skeleton, SkeletonCard, SkeletonPage } from '../../career/components/ui/Skeleton';
export { default as SectionHeader } from './SectionHeader';
