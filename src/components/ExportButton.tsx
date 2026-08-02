"use client";

import type { ContractWithUnits } from "@/lib/types";
import { exportContractsToExcel } from "@/lib/exportExcel";
import { Button } from "@/components/ui";

export function ExportButton({
  contracts,
  filename,
  label = "تصدير Excel",
}: {
  contracts: ContractWithUnits[];
  filename: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => exportContractsToExcel(contracts, filename)}
      disabled={contracts.length === 0}
    >
      {label}
    </Button>
  );
}
