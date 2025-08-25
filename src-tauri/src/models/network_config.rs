use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(Default)]
pub struct NetworkConfigRow {
    pub blueprint: Option<String>,
    pub server_label: Option<String>,
    pub is_external: Option<bool>,
    pub server_tags: Option<String>,
    pub link_group_ifname: Option<String>,
    pub link_group_lag_mode: Option<String>,
    pub link_group_ct_names: Option<String>,
    pub link_group_tags: Option<String>,
    pub link_speed: Option<String>,
    pub server_ifname: Option<String>,
    pub switch_label: Option<String>,
    pub switch_ifname: Option<String>,
    pub link_tags: Option<String>,
    pub comment: Option<String>,
}

