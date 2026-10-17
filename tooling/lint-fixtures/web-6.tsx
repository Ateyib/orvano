// lint-as: console/src/features/tables/components/rows-page.tsx
import React, { useMemo } from "react";

export const useTotal = (rows: number[]): number => useMemo(() => rows.length, [rows]);
export const useCount = (rows: number[]): number => React.useCallback(() => rows.length, [rows])();
