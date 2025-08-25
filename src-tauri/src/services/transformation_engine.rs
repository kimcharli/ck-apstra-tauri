use crate::models::enhanced_conversion_map::{
    TransformationRule, TransformationLogic, TransformationType
};
use std::collections::HashMap;
use serde_json::Value;

type TransformationFunction = Box<dyn Fn(&str, Option<&HashMap<String, String>>) -> Result<String, String> + Send + Sync>;

pub struct TransformationEngine {
    functions: HashMap<String, TransformationFunction>,
}

impl Default for TransformationEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl TransformationEngine {
    pub fn new() -> Self {
        let mut engine = Self {
            functions: HashMap::new(),
        };
        
        // Register built-in transformation functions
        engine.register_builtin_functions();
        engine
    }

    fn register_builtin_functions(&mut self) {
        // Interface name generation based on speed and port
        self.functions.insert(
            "generate_interface_name".to_string(),
            Box::new(|input: &str, context: Option<&HashMap<String, String>>| {
                Self::generate_interface_name(input, context)
            })
        );

        // Speed normalization
        self.functions.insert(
            "normalize_speed".to_string(),
            Box::new(|input: &str, _context: Option<&HashMap<String, String>>| {
                Ok(Self::normalize_speed_value(input))
            })
        );

        // LAG mode conversion
        self.functions.insert(
            "lag_mode_conversion".to_string(),
            Box::new(|input: &str, _context: Option<&HashMap<String, String>>| {
                Ok(Self::convert_lag_mode_value(input))
            })
        );

        // String cleaning functions
        self.functions.insert(
            "trim_whitespace".to_string(),
            Box::new(|input: &str, _context: Option<&HashMap<String, String>>| {
                Ok(input.trim().to_string())
            })
        );

        self.functions.insert(
            "to_uppercase".to_string(),
            Box::new(|input: &str, _context: Option<&HashMap<String, String>>| {
                Ok(input.to_uppercase())
            })
        );

        self.functions.insert(
            "to_lowercase".to_string(),
            Box::new(|input: &str, _context: Option<&HashMap<String, String>>| {
                Ok(input.to_lowercase())
            })
        );
    }

    pub fn apply_transformation(
        &self, 
        rule: &TransformationRule, 
        input: &str, 
        context: Option<&HashMap<String, String>>
    ) -> Result<String, String> {
        // Check conditions first
        if let Some(conditions) = &rule.conditions {
            if !self.evaluate_conditions(conditions, input, context) {
                return Ok(input.to_string()); // Return unchanged if conditions not met
            }
        }

        match &rule.logic {
            TransformationLogic::ValueMap { mappings: value_map } => {
                // Direct value mapping
                if let Some(mapped_value) = value_map.get(input) {
                    Ok(mapped_value.clone())
                } else {
                    // Try case-insensitive matching
                    let input_lower = input.to_lowercase();
                    for (key, value) in value_map {
                        if key.to_lowercase() == input_lower {
                            return Ok(value.clone());
                        }
                    }
                    Ok(input.to_string()) // Return original if no mapping found
                }
            }
            TransformationLogic::Template { template } => {
                // Template-based transformation
                self.apply_template_transformation(template, input, context)
            }
            TransformationLogic::Function { name: function_name } => {
                // Custom function call
                if let Some(func) = self.functions.get(function_name) {
                    func(input, context)
                } else {
                    Err(format!("Unknown transformation function: {}", function_name))
                }
            }
            TransformationLogic::Pipeline { steps } => {
                // Multi-step transformation pipeline
                let mut current_value = input.to_string();
                for step in steps {
                    current_value = self.apply_transformation_step(&step.step_type, &current_value, &step.parameters, context)?;
                }
                Ok(current_value)
            }
        }
    }

    fn evaluate_conditions(
        &self, 
        conditions: &HashMap<String, Value>, 
        input: &str, 
        context: Option<&HashMap<String, String>>
    ) -> bool {
        log::debug!("Evaluating conditions for input '{}' with conditions: {:?}, context: {:?}", input, conditions, context);
        for (condition_key, condition_value) in conditions {
            match condition_key.as_str() {
                "input_type" => {
                    let required_type = condition_value.as_str().unwrap_or("");
                    match required_type {
                        "numeric_port" => {
                            if !Self::is_numeric_port(input) {
                                return false;
                            }
                        }
                        _ => return false,
                    }
                }
                "has_speed_data" => {
                    let requires_speed = condition_value.as_bool().unwrap_or(false);
                    if requires_speed {
                        if let Some(ctx) = context {
                            if !ctx.contains_key("link_speed") || ctx.get("link_speed").unwrap_or(&"".to_string()).is_empty() {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }
                }
                "min_length" => {
                    let min_len = condition_value.as_u64().unwrap_or(0) as usize;
                    if input.len() < min_len {
                        return false;
                    }
                }
                "max_length" => {
                    let max_len = condition_value.as_u64().unwrap_or(0) as usize;
                    if input.len() > max_len {
                        return false;
                    }
                }
                _ => continue,
            }
        }
        true
    }

    fn apply_template_transformation(
        &self, 
        template: &str, 
        input: &str, 
        context: Option<&HashMap<String, String>>
    ) -> Result<String, String> {
        let mut result = template.to_string();
        
        // Replace {input} with the input value
        result = result.replace("{input}", input);
        
        // Replace context variables {field_name}
        if let Some(ctx) = context {
            for (key, value) in ctx {
                let placeholder = format!("{{{}}}", key);
                result = result.replace(&placeholder, value);
            }
        }
        
        Ok(result)
    }

    fn apply_transformation_step(
        &self,
        step_type: &str,
        input: &str,
        parameters: &HashMap<String, Value>,
        context: Option<&HashMap<String, String>>
    ) -> Result<String, String> {
        match step_type {
            "function" => {
                if let Some(func_name) = parameters.get("name").and_then(|v| v.as_str()) {
                    if let Some(func) = self.functions.get(func_name) {
                        func(input, context)
                    } else {
                        Err(format!("Unknown function in pipeline: {}", func_name))
                    }
                } else {
                    Err("Function step missing 'name' parameter".to_string())
                }
            }
            "template" => {
                if let Some(template) = parameters.get("template").and_then(|v| v.as_str()) {
                    self.apply_template_transformation(template, input, context)
                } else {
                    Err("Template step missing 'template' parameter".to_string())
                }
            }
            "value_map" => {
                if let Some(mappings_obj) = parameters.get("mappings").and_then(|v| v.as_object()) {
                    if let Some(mapped) = mappings_obj.get(input).and_then(|v| v.as_str()) {
                        Ok(mapped.to_string())
                    } else {
                        Ok(input.to_string())
                    }
                } else {
                    Err("Value map step missing 'mappings' parameter".to_string())
                }
            }
            _ => Err(format!("Unknown transformation step type: {}", step_type))
        }
    }

    fn is_numeric_port(input: &str) -> bool {
        input.trim().parse::<u32>().is_ok()
    }

    fn generate_interface_name(input: &str, context: Option<&HashMap<String, String>>) -> Result<String, String> {
        // Only apply to numeric ports
        if !Self::is_numeric_port(input) {
            return Ok(input.to_string());
        }

        let port_num = input.trim().parse::<u32>()
            .map_err(|_| "Invalid port number".to_string())?;

        // Get speed from context if available
        let speed = context
            .and_then(|ctx| ctx.get("link_speed"))
            .map(|s| s.as_str())
            .unwrap_or("");

        let interface_prefix = Self::determine_interface_prefix(speed);
        Ok(format!("{}-0/0/{}", interface_prefix, port_num))
    }

    fn determine_interface_prefix(speed: &str) -> &'static str {
        let normalized_speed = Self::normalize_speed_value(speed);
        
        match normalized_speed.as_str() {
            "1G" | "1000M" => "ge",
            "10G" | "10000M" => "xe",
            "25G" | "25000M" | "40G" | "40000M" | "100G" | "100000M" => "et",
            _ => {
                // Try to parse numeric value
                if let Ok(numeric_part) = normalized_speed.chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse::<u32>() {
                    
                    if normalized_speed.ends_with('G') {
                        match numeric_part {
                            1 => "ge",
                            10 => "xe",
                            25 | 40 | 100 => "et",
                            _ if numeric_part > 10 => "et",
                            _ => "ge",
                        }
                    } else {
                        "ge" // Default for unknown speeds
                    }
                } else {
                    "ge" // Default fallback
                }
            }
        }
    }

    fn normalize_speed_value(speed: &str) -> String {
        if speed.is_empty() {
            return speed.to_string();
        }

        let speed_clean = speed.trim().to_uppercase();
        
        // Handle common speed formats
        if speed_clean.ends_with("GBPS") || speed_clean.ends_with("GB") {
            if let Ok(num_part) = speed_clean.chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect::<String>()
                .parse::<f32>() {
                return format!("{}G", num_part as u32);
            }
        }
        
        if speed_clean.ends_with("MBPS") || speed_clean.ends_with("MB") {
            if let Ok(num_part) = speed_clean.chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect::<String>()
                .parse::<f32>() {
                return format!("{}M", num_part as u32);
            }
        }

        // Handle numeric-only speeds (assume GB)
        if let Ok(num) = speed_clean.parse::<u32>() {
            return format!("{}G", num);
        }

        // Handle common speed values
        match speed_clean.as_str() {
            "1000" => "1G".to_string(),
            "10000" => "10G".to_string(),
            "25000" => "25G".to_string(),
            "40000" => "40G".to_string(),
            "100000" => "100G".to_string(),
            _ => {
                // If already in correct format (ends with G or M), return as-is
                if speed_clean.ends_with('G') || speed_clean.ends_with('M') {
                    speed_clean
                } else {
                    speed.to_string() // Return original if can't normalize
                }
            }
        }
    }

    fn convert_lag_mode_value(input: &str) -> String {
        if input.is_empty() {
            return input.to_string();
        }

        let input_clean = input.trim().to_lowercase();
        
        match input_clean.as_str() {
            "yes" | "y" | "true" | "1" => "lacp_active".to_string(),
            "no" | "n" | "false" | "0" => "none".to_string(),
            // If already a valid LAG mode, return as-is
            "lacp_active" | "static" | "none" => input_clean,
            "lacp" => "lacp_active".to_string(), // Convert legacy format
            _ => input.to_string() // Return original if unrecognized
        }
    }

    pub fn register_custom_function<F>(&mut self, name: String, function: F) 
    where 
        F: Fn(&str, Option<&HashMap<String, String>>) -> Result<String, String> + Send + Sync + 'static 
    {
        self.functions.insert(name, Box::new(function));
    }

    pub fn validate_transformation_rule(&self, rule: &TransformationRule) -> Result<(), String> {
        match &rule.logic {
            TransformationLogic::Function { name: function_name } => {
                if !self.functions.contains_key(function_name) {
                    return Err(format!("Unknown transformation function: {}", function_name));
                }
            }
            TransformationLogic::Template { template } => {
                // Basic template validation - ensure it has valid placeholders
                if template.is_empty() {
                    return Err("Template cannot be empty".to_string());
                }
            }
            TransformationLogic::ValueMap { mappings } => {
                if mappings.is_empty() {
                    return Err("Value map cannot be empty".to_string());
                }
            }
            TransformationLogic::Pipeline { steps } => {
                if steps.is_empty() {
                    return Err("Pipeline cannot be empty".to_string());
                }
                for step in steps {
                    match step.step_type.as_str() {
                        "function" => {
                            if let Some(func_name) = step.parameters.get("name").and_then(|v| v.as_str()) {
                                if !self.functions.contains_key(func_name) {
                                    return Err(format!("Unknown function in pipeline: {}", func_name));
                                }
                            } else {
                                return Err("Function step missing 'name' parameter".to_string());
                            }
                        }
                        "template" => {
                            if step.parameters.get("template").and_then(|v| v.as_str()).is_none() {
                                return Err("Template step missing 'template' parameter".to_string());
                            }
                        }
                        "value_map" => {
                            if step.parameters.get("mappings").and_then(|v| v.as_object()).is_none() {
                                return Err("Value map step missing 'mappings' parameter".to_string());
                            }
                        }
                        _ => {
                            return Err(format!("Unknown transformation step type: {}", step.step_type));
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::enhanced_conversion_map::*;

    #[test]
    fn test_interface_name_generation() {
        let _engine = TransformationEngine::new();
        let mut context = HashMap::new();
        context.insert("link_speed".to_string(), "25G".to_string());

        let result = TransformationEngine::generate_interface_name("5", Some(&context));
        assert_eq!(result.unwrap(), "et-0/0/5");

        context.insert("link_speed".to_string(), "1G".to_string());
        let result = TransformationEngine::generate_interface_name("3", Some(&context));
        assert_eq!(result.unwrap(), "ge-0/0/3");

        context.insert("link_speed".to_string(), "10G".to_string());
        let result = TransformationEngine::generate_interface_name("7", Some(&context));
        assert_eq!(result.unwrap(), "xe-0/0/7");
    }

    #[test]
    fn test_speed_normalization() {
        assert_eq!(TransformationEngine::normalize_speed_value("25GB"), "25G");
        assert_eq!(TransformationEngine::normalize_speed_value("25 Gbps"), "25G");
        assert_eq!(TransformationEngine::normalize_speed_value("1000"), "1000G");
        assert_eq!(TransformationEngine::normalize_speed_value("10G"), "10G");
        assert_eq!(TransformationEngine::normalize_speed_value(""), "");
    }

    #[test]
    fn test_lag_mode_conversion() {
        assert_eq!(TransformationEngine::convert_lag_mode_value("Yes"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("yes"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("Y"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("y"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("true"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("1"), "lacp_active");
        
        assert_eq!(TransformationEngine::convert_lag_mode_value("No"), "none");
        assert_eq!(TransformationEngine::convert_lag_mode_value("no"), "none");
        assert_eq!(TransformationEngine::convert_lag_mode_value("N"), "none");
        assert_eq!(TransformationEngine::convert_lag_mode_value("n"), "none");
        assert_eq!(TransformationEngine::convert_lag_mode_value("false"), "none");
        assert_eq!(TransformationEngine::convert_lag_mode_value("0"), "none");
        
        // Legacy format conversion
        assert_eq!(TransformationEngine::convert_lag_mode_value("lacp"), "lacp_active");
        
        // Already correct values
        assert_eq!(TransformationEngine::convert_lag_mode_value("lacp_active"), "lacp_active");
        assert_eq!(TransformationEngine::convert_lag_mode_value("static"), "static");
        assert_eq!(TransformationEngine::convert_lag_mode_value("none"), "none");
        
        // Unrecognized values pass through
        assert_eq!(TransformationEngine::convert_lag_mode_value("unknown"), "unknown");
        assert_eq!(TransformationEngine::convert_lag_mode_value(""), "");
    }

    #[test]
    fn test_value_mapping_transformation() {
        let engine = TransformationEngine::new();
        
        let mut value_map = HashMap::new();
        value_map.insert("25GB".to_string(), "25G".to_string());
        value_map.insert("10GB".to_string(), "10G".to_string());

        let rule = TransformationRule {
            name: "test_mapping".to_string(),
            description: "Test mapping".to_string(),
            rule_type: TransformationType::ValueMapping,
            conditions: None,
            logic: TransformationLogic::ValueMap { mappings: value_map },
            priority: 1,
        };

        let result = engine.apply_transformation(&rule, "25GB", None);
        assert_eq!(result.unwrap(), "25G");

        let result = engine.apply_transformation(&rule, "unknown", None);
        assert_eq!(result.unwrap(), "unknown");
    }

    #[test]
    fn test_template_transformation() {
        let engine = TransformationEngine::new();
        let mut context = HashMap::new();
        context.insert("port".to_string(), "5".to_string());

        let rule = TransformationRule {
            name: "test_template".to_string(),
            description: "Test template".to_string(),
            rule_type: TransformationType::Template,
            conditions: None,
            logic: TransformationLogic::Template { template: "et-0/0/{port}".to_string() },
            priority: 1,
        };

        let result = engine.apply_transformation(&rule, "input", Some(&context));
        assert_eq!(result.unwrap(), "et-0/0/5");
    }
}