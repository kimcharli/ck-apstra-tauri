import React, { useState, useEffect } from 'react';
import { EnhancedConversionMap, FieldDefinition, ValidationError } from '../services/EnhancedConversionService';

interface DynamicFormProps {
  enhancedMap: EnhancedConversionMap;
  initialData?: Record<string, any>;
  context?: string;
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (fieldName: string, value: any, isValid: boolean) => void;
  onValidationChange?: (errors: ValidationError[]) => void;
}

interface FormField {
  fieldName: string;
  definition: FieldDefinition;
  value: any;
  errors: string[];
  touched: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  enhancedMap,
  initialData = {},
  context,
  onSubmit,
  onChange,
  onValidationChange
}) => {
  const [fields, setFields] = useState<Record<string, FormField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize fields from enhanced map
  useEffect(() => {
    const newFields: Record<string, FormField> = {};
    
    Object.entries(enhancedMap.field_definitions).forEach(([fieldName, definition]) => {
      // Skip hidden fields unless in debug context
      if (definition.ui_config?.hidden && context !== 'debug') {
        return;
      }

      newFields[fieldName] = {
        fieldName,
        definition,
        value: initialData[fieldName] || getDefaultValue(definition),
        errors: [],
        touched: false
      };
    });

    setFields(newFields);
  }, [enhancedMap, initialData, context]);

  const getDefaultValue = (definition: FieldDefinition) => {
    switch (definition.data_type) {
      case 'Boolean':
        return false;
      case 'Array':
        return [];
      case 'Number':
        return 0;
      case 'Json':
        return {};
      default:
        return '';
    }
  };

  const validateField = (fieldName: string, value: any, definition: FieldDefinition): string[] => {
    const errors: string[] = [];
    const validation = definition.validation_rules;

    // Required field validation
    if (definition.is_required) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
        errors.push(`${definition.display_name} is required`);
      }
    }

    // Skip other validations if empty and not required
    if (!definition.is_required && (value == null || value === '')) {
      return errors;
    }

    // String validations
    if (definition.data_type === 'String' && typeof value === 'string') {
      if (validation.min_length && value.length < validation.min_length) {
        errors.push(`${definition.display_name} must be at least ${validation.min_length} characters`);
      }
      if (validation.max_length && value.length > validation.max_length) {
        errors.push(`${definition.display_name} must not exceed ${validation.max_length} characters`);
      }
      if (validation.pattern) {
        try {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push(`${definition.display_name} format is invalid`);
          }
        } catch (e) {
          console.warn(`Invalid regex pattern for ${fieldName}:`, validation.pattern);
        }
      }
      if (validation.allowed_values && !validation.allowed_values.includes(value)) {
        errors.push(`${definition.display_name} must be one of: ${validation.allowed_values.join(', ')}`);
      }
    }

    // Numeric validations
    if (definition.data_type === 'Number') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${definition.display_name} must be a valid number`);
      } else if (validation.numeric_range) {
        const range = validation.numeric_range;
        if (range.min != null && numValue < range.min) {
          errors.push(`${definition.display_name} must be at least ${range.min}`);
        }
        if (range.max != null && numValue > range.max) {
          errors.push(`${definition.display_name} must not exceed ${range.max}`);
        }
        if ((range as any).step != null && (numValue - (range.min || 0)) % (range as any).step !== 0) {
          errors.push(`${definition.display_name} must be in steps of ${(range as any).step}`);
        }
      }
    }

    return errors;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFields(prev => {
      const field = prev[fieldName];
      if (!field) return prev;

      const errors = validateField(fieldName, value, field.definition);
      const updatedField = {
        ...field,
        value,
        errors,
        touched: true
      };

      const newFields = {
        ...prev,
        [fieldName]: updatedField
      };

      // Notify parent of changes
      onChange?.(fieldName, value, errors.length === 0);

      // Notify parent of validation changes
      const allErrors = Object.values(newFields)
        .flatMap(f => f.errors.map(error => ({
          field: f.fieldName,
          message: error,
          severity: 'Error' as const
        })));
      onValidationChange?.(allErrors);

      return newFields;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setFields(prev => {
      const touched = Object.fromEntries(
        Object.entries(prev).map(([key, field]) => [
          key,
          { ...field, touched: true }
        ])
      );
      return touched;
    });

    // Check if form is valid
    const hasErrors = Object.values(fields).some(field => field.errors.length > 0);
    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);
    const formData = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.value])
    );

    try {
      onSubmit?.(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const { fieldName, definition, value, errors, touched } = field;
    const hasError = touched && errors.length > 0;

    const fieldId = `field-${fieldName}`;
    const fieldClassName = `form-field ${hasError ? 'field-error' : ''} ${definition.is_required ? 'field-required' : ''}`;

    switch (definition.data_type) {
      case 'Boolean':
        return (
          <div key={fieldName} className={fieldClassName}>
            <label htmlFor={fieldId} className="field-label">
              <input
                id={fieldId}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
                className="checkbox-input"
              />
              {definition.display_name}
              {definition.is_required && <span className="required-indicator">*</span>}
            </label>
            {definition.description && (
              <div className="field-description">{definition.description}</div>
            )}
            {hasError && (
              <div className="field-errors">
                {errors.map((error, index) => (
                  <div key={index} className="field-error-message">{error}</div>
                ))}
              </div>
            )}
          </div>
        );

      case 'Array':
        const arrayValue = Array.isArray(value) ? value : [];
        return (
          <div key={fieldName} className={fieldClassName}>
            <label htmlFor={fieldId} className="field-label">
              {definition.display_name}
              {definition.is_required && <span className="required-indicator">*</span>}
            </label>
            <textarea
              id={fieldId}
              value={arrayValue.join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(line => line.trim());
                handleFieldChange(fieldName, lines);
              }}
              placeholder={`One item per line${definition.description ? `\n${definition.description}` : ''}`}
              className="textarea-input"
              rows={3}
            />
            {hasError && (
              <div className="field-errors">
                {errors.map((error, index) => (
                  <div key={index} className="field-error-message">{error}</div>
                ))}
              </div>
            )}
          </div>
        );

      case 'Json':
        return (
          <div key={fieldName} className={fieldClassName}>
            <label htmlFor={fieldId} className="field-label">
              {definition.display_name}
              {definition.is_required && <span className="required-indicator">*</span>}
            </label>
            <textarea
              id={fieldId}
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(fieldName, parsed);
                } catch {
                  handleFieldChange(fieldName, e.target.value);
                }
              }}
              placeholder={`JSON format${definition.description ? `\n${definition.description}` : ''}`}
              className="textarea-input json-input"
              rows={4}
            />
            {hasError && (
              <div className="field-errors">
                {errors.map((error, index) => (
                  <div key={index} className="field-error-message">{error}</div>
                ))}
              </div>
            )}
          </div>
        );

      case 'Number':
        return (
          <div key={fieldName} className={fieldClassName}>
            <label htmlFor={fieldId} className="field-label">
              {definition.display_name}
              {definition.is_required && <span className="required-indicator">*</span>}
            </label>
            <input
              id={fieldId}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value ? parseFloat(e.target.value) : '')}
              placeholder={definition.description || ''}
              className="text-input"
              step={(definition.validation_rules.numeric_range as any)?.step}
              min={definition.validation_rules.numeric_range?.min}
              max={definition.validation_rules.numeric_range?.max}
            />
            {hasError && (
              <div className="field-errors">
                {errors.map((error, index) => (
                  <div key={index} className="field-error-message">{error}</div>
                ))}
              </div>
            )}
          </div>
        );

      default: // String
        if (definition.validation_rules.allowed_values?.length) {
          // Render as select dropdown
          return (
            <div key={fieldName} className={fieldClassName}>
              <label htmlFor={fieldId} className="field-label">
                {definition.display_name}
                {definition.is_required && <span className="required-indicator">*</span>}
              </label>
              <select
                id={fieldId}
                value={value || ''}
                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                className="select-input"
              >
                <option value="">-- Select {definition.display_name} --</option>
                {definition.validation_rules.allowed_values.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {definition.description && (
                <div className="field-description">{definition.description}</div>
              )}
              {hasError && (
                <div className="field-errors">
                  {errors.map((error, index) => (
                    <div key={index} className="field-error-message">{error}</div>
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          // Render as text input
          return (
            <div key={fieldName} className={fieldClassName}>
              <label htmlFor={fieldId} className="field-label">
                {definition.display_name}
                {definition.is_required && <span className="required-indicator">*</span>}
              </label>
              <input
                id={fieldId}
                type="text"
                value={value || ''}
                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                placeholder={definition.description || ''}
                className="text-input"
                maxLength={definition.validation_rules.max_length}
                minLength={definition.validation_rules.min_length}
              />
              {hasError && (
                <div className="field-errors">
                  {errors.map((error, index) => (
                    <div key={index} className="field-error-message">{error}</div>
                  ))}
                </div>
              )}
            </div>
          );
        }
    }
  };

  const sortedFields = Object.values(fields).sort((a, b) => {
    // Required fields first
    if (a.definition.is_required && !b.definition.is_required) return -1;
    if (!a.definition.is_required && b.definition.is_required) return 1;
    
    // Then by display name
    return a.definition.display_name.localeCompare(b.definition.display_name);
  });

  const hasAnyErrors = Object.values(fields).some(field => field.errors.length > 0);

  return (
    <form className="dynamic-form" onSubmit={handleSubmit}>
      <div className="form-fields">
        {sortedFields.map(renderField)}
      </div>
      
      {onSubmit && (
        <div className="form-actions">
          <button
            type="submit"
            disabled={hasAnyErrors || isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      <style>{`
        .dynamic-form {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-label {
          font-weight: bold;
          color: #333;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .field-required .field-label {
          color: #2c3e50;
        }

        .required-indicator {
          color: #dc3545;
          font-weight: bold;
        }

        .field-description {
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .text-input,
        .textarea-input,
        .select-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .text-input:focus,
        .textarea-input:focus,
        .select-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .checkbox-input {
          margin-right: 8px;
        }

        .json-input {
          font-family: monospace;
        }

        .field-error {
          border-color: #dc3545;
        }

        .field-error .text-input,
        .field-error .textarea-input,
        .field-error .select-input {
          border-color: #dc3545;
          background-color: #fff5f5;
        }

        .field-errors {
          margin-top: 4px;
        }

        .field-error-message {
          font-size: 12px;
          color: #dc3545;
          background-color: #f8d7da;
          padding: 4px 8px;
          border-radius: 3px;
          margin-bottom: 2px;
        }

        .form-actions {
          margin-top: 24px;
          display: flex;
          justify-content: center;
        }

        .submit-button {
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .submit-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
};