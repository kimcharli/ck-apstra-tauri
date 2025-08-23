# ProvisioningTable Test Suite

Comprehensive test suite for the ProvisioningTable component, covering server grouping, Fetch & Compare functionality, and "Only in Blueprint" connection handling.

## Test Structure

### 📁 Test Files

- **`ProvisioningTable.test.tsx`** - Main component tests
  - Server grouping functionality
  - Blueprint-only connection styling
  - UI interactions (toggle, filtering, selection)
  - Data integrity and error handling

- **`CompareLogic.test.tsx`** - Fetch & Compare logic tests
  - Duplicate prevention (switch_label + server_label + switch_ifname)
  - Server grouping integration with API results
  - "Only in Blueprint" connection marking
  - Error handling for malformed API responses

- **`Performance.test.tsx`** - Performance and scalability tests
  - Large dataset handling (up to 500 connections)
  - Server grouping performance with various data distributions
  - Memory usage optimization
  - Rendering and filtering performance

- **`fixtures/testData.ts`** - Test data and utilities
  - Multi-server test scenarios
  - Blueprint-only connection examples
  - Mock API response data
  - Large dataset generators

## 🧪 Test Categories

### Unit Tests
- `groupConnectionsByServer()` function logic
- Data transformation and filtering
- Cell formatting and styling
- Edge case handling

### Integration Tests
- Complete Fetch & Compare workflow
- Server grouping with API data integration
- UI state management across operations
- Component lifecycle and re-renders

### Performance Tests
- Large dataset rendering (200-500+ connections)
- Server grouping efficiency
- Memory usage optimization
- User interaction responsiveness

## 🚀 Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run only ProvisioningTable tests
npm run test:provisioning

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI interface
npm run test:ui
```

### Specific Test Suites

```bash
# Run unit tests only
npx vitest run ProvisioningTable.test.tsx

# Run performance tests only
npx vitest run Performance.test.tsx

# Run comparison logic tests only
npx vitest run CompareLogic.test.tsx
```

### Test with Different Datasets

```bash
# Test with verbose output to see dataset details
npx vitest run --reporter=verbose src/components/ProvisioningTable
```

## 📊 Coverage Targets

- **Functions**: > 90%
- **Lines**: > 85%
- **Branches**: > 80%
- **Statements**: > 85%

## 🎯 Key Test Scenarios

### 1. Server Grouping
- **Alphabetical Grouping**: Servers appear in alphabetical order
- **Interface Sorting**: Within each server, connections sorted by switch/interface
- **Mixed Data**: Handles unsorted input data correctly
- **Edge Cases**: Empty server names, special characters

### 2. Duplicate Prevention
- **Three-Field Key**: `switch_label + server_label + switch_ifname`
- **Server Interface Ignored**: Different `server_ifname` values don't prevent duplicates
- **Multi-Interface Servers**: Same server can connect via different switch interfaces

### 3. Blueprint-Only Connections
- **Visual Styling**: Blue highlighting and italic text
- **Comment Marking**: "🔗 Only in Blueprint" display
- **Grouping Integration**: New connections grouped with existing servers
- **Legend Display**: Automatic legend when blueprint-only rows exist

### 4. Performance Benchmarks
- **Rendering**: < 2 seconds for 500 connections
- **Filtering**: < 100ms for large datasets
- **Sorting**: < 200ms for complex sorts
- **Memory**: < 50MB growth for large datasets

## 🐛 Testing Edge Cases

### Data Quality Issues
- Missing or empty server names
- Null/undefined values in critical fields
- Special characters in names
- Malformed API responses

### Performance Edge Cases
- Many servers with single connections (worst case for grouping)
- Few servers with many connections (stress test grouping logic)
- Rapid UI interactions (toggle, filter, sort)
- Memory leak prevention

### API Integration Issues
- Empty API responses
- Partial API data
- Network timeout scenarios
- Authentication failures

## 🔧 Test Configuration

### Environment Setup
- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom for DOM simulation
- **Mocks**: Tauri APIs, Apstra services, external utilities

### Custom Matchers
- Uses `@testing-library/jest-dom` for enhanced assertions
- Performance timing assertions
- Memory usage validation (when available)

### Mock Strategy
- **ApstraApiService**: Mocked for predictable API responses
- **Blueprint Mapping**: Mocked for consistent blueprint resolution
- **Tauri APIs**: Mocked to avoid native calls in tests

## 🎨 Test Data Patterns

### Multi-Server Scenarios
```typescript
// 5 connections across 3 servers (Web01, DB01, App01)
// Tests typical enterprise network topology
multiServerTestData
```

### Blueprint-Only Scenarios
```typescript
// Mix of Excel and API-sourced connections
// Tests "Only in Blueprint" styling and grouping
blueprintOnlyTestData
```

### Performance Scenarios
```typescript
// Generated datasets up to 500 connections
// Tests scalability and performance limits
generateLargeTestDataset(serverCount, connectionsPerServer)
```

## 📋 Test Checklist

Before committing changes to ProvisioningTable:

- [ ] All unit tests pass
- [ ] Performance tests complete within thresholds
- [ ] Coverage targets met
- [ ] No console errors or warnings
- [ ] Memory usage remains stable
- [ ] Edge cases handled gracefully

## 🚨 Known Test Limitations

1. **Visual Testing**: Tests don't verify pixel-perfect CSS styling
2. **Network Conditions**: Tests don't simulate network latency/failures
3. **Browser Compatibility**: Tests run in jsdom, not real browsers
4. **Real API Integration**: Uses mocked APIs, not live Apstra connections

## 💡 Tips for Writing Additional Tests

1. **Use Fixtures**: Leverage existing test data fixtures for consistency
2. **Test Grouping**: Always verify server grouping is maintained
3. **Performance Awareness**: Include timing assertions for complex operations
4. **Edge Cases**: Test with empty, null, and malformed data
5. **User Perspective**: Test complete workflows, not just individual functions

## 🔍 Debugging Tests

### Common Issues
- **Mock Problems**: Verify all external dependencies are properly mocked
- **Timing Issues**: Use `waitFor` for asynchronous operations
- **Data Consistency**: Check that test data matches expected structure
- **Performance Variance**: Account for system performance differences

### Debugging Commands
```bash
# Run single test with debug output
npx vitest run --reporter=verbose ProvisioningTable.test.tsx

# Run with Node.js debugging
node --inspect-brk ./node_modules/.bin/vitest run

# Check coverage details
npm run test:coverage && open coverage/index.html
```