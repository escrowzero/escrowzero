export type RelayInput = {
  kind: "create" | "release" | "refund";
  contract: string;
  creator: string;
  beneficiary: string;
  token: string;
  amount: string;
  durationSeconds: number;
  milestone: boolean;
  memo: string;
  dealId: string;
  partial: string;
  deadline: number;
  signature: string;
};

export type RelayResult = {
  hash: string;
  chainDealId?: string;
};
