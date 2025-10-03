// Domains Module
// Central module declaration for all business domains

pub mod excel;
pub mod apstra;
pub mod conversion;
pub mod provisioning;
pub mod shared;

// Re-export domain constants for reference
pub use excel::EXCEL_DOMAIN;
pub use apstra::APSTRA_DOMAIN;
pub use conversion::CONVERSION_DOMAIN;
pub use provisioning::PROVISIONING_DOMAIN;
pub use shared::SHARED_DOMAIN;

// Domain type enumeration
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Domain {
    Excel,
    Apstra,
    Conversion,
    Provisioning,
    Shared,
}

impl Domain {
    pub fn as_str(&self) -> &'static str {
        match self {
            Domain::Excel => EXCEL_DOMAIN,
            Domain::Apstra => APSTRA_DOMAIN,
            Domain::Conversion => CONVERSION_DOMAIN,
            Domain::Provisioning => PROVISIONING_DOMAIN,
            Domain::Shared => SHARED_DOMAIN,
        }
    }
}