// lint-as: console/src/features/tables/components/rows-page.tsx
declare const navigate: (options: { search: Record<string, string> }) => void;
declare const router: { navigate: (options: { search: Record<string, string> }) => void };

navigate({ search: { sort: "name" } });
router.navigate({ search: { sort: "name" } });
