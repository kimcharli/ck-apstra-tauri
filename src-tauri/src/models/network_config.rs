use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl Default for NetworkConfigRow {
    fn default() -> Self {
        Self {
            blueprint: None,
            server_label: None,
            is_external: None,
            server_tags: None,
            link_group_ifname: None,
            link_group_lag_mode: None,
            link_group_ct_names: None,
            link_group_tags: None,
            link_speed: None,
            server_ifname: None,
            switch_label: None,
            switch_ifname: None,
            link_tags: None,
            comment: None,
        }
    }
}