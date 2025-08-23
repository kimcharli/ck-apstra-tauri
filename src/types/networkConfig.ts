export interface NetworkConfigRow {
  blueprint?: string;
  server_label?: string;
  is_external?: boolean;
  server_tags?: string;
  switch_tags?: string;
  link_group_ifname?: string;
  link_group_lag_mode?: string;
  link_group_ct_names?: string;
  link_group_tags?: string;
  link_speed?: string;
  server_ifname?: string;
  switch_label?: string;
  switch_ifname?: string;
  link_tags?: string;
  comment?: string;
}

export interface ValidationError {
  row_index: number;
  field: string;
  message: string;
}

export interface DataValidationResult {
  valid_rows: NetworkConfigRow[];
  invalid_rows: NetworkConfigRow[];
  errors: ValidationError[];
  duplicates_removed: number;
}